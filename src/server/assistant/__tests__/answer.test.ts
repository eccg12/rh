import { describe, expect, it } from "vitest";

import { createTestDomain, RH } from "@/domain/__tests__/helpers";
import type { DomainContext } from "@/domain/context";
import { changeBenefitProvider } from "@/domain/services/content";
import { answerQuestion } from "@/server/assistant/answer";
import { SUGGESTED_QUESTIONS } from "@/config/assistant";

import { answerText, collect, FakeLlm, lastMeta, localNow, routeOf } from "./helpers";

const ASKER = "marina-takeda";

const EXPECTED_SOURCE: Record<(typeof SUGGESTED_QUESTIONS)[number], string> = {
  "Como lanço uma despesa de viagem no VExpenses?": "kb:como-lancar-despesa",
  "Qual é o nosso plano de saúde e como eu uso?": "beneficio:saude-bradesco",
  "Com quem eu falo sobre o meu notebook?": "kb:meu-notebook",
  "Como funciona o apontamento de horas?": "kb:apontamento-de-horas",
  "Preciso de aprovação para comprar passagem?": "kb:como-solicitar-viagem",
  "Como envio minha nota fiscal do mês como PJ?": "kb:nota-fiscal-pj",
};

async function ask(ctx: DomainContext, question: string, options = localNow(), history: { role: "user" | "assistant"; content: string }[] = []) {
  return collect(answerQuestion(ctx, { question, personId: ASKER, history }, options));
}

describe("resposta em modo local (aceite do CP5)", () => {
  it.each(SUGGESTED_QUESTIONS)("responde com fonte: %s", async (question) => {
    const { ctx } = await createTestDomain();
    const events = await ask(ctx, question);
    const meta = lastMeta(events);
    expect(meta?.mode).toBe("local");
    expect(meta?.sources[0]?.id).toBe(EXPECTED_SOURCE[question]);
    expect(answerText(events).length).toBeGreaterThan(60);
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(routeOf(events)).toBeUndefined();
  });

  it("traz o passo a passo numerado do artigo", async () => {
    const { ctx } = await createTestDomain();
    const text = answerText(await ask(ctx, "Como lanço uma despesa de viagem no VExpenses?"));
    expect(text).toMatch(/^Toda despesa de trabalho/);
    expect(text).toContain("1. Abra o aplicativo VExpenses");
    expect(text).toContain("5. Junte as despesas");
    expect(text).toContain("Despesas sem comprovante legível");
  });

  it("benefício: resumo, como usar e elegibilidade", async () => {
    const { ctx } = await createTestDomain();
    const text = answerText(await ask(ctx, "Qual é o nosso plano de saúde e como eu uso?"));
    expect(text).toContain("Bradesco Saúde");
    expect(text).toContain("1. Baixe o aplicativo Bradesco Saúde");
    expect(text).toContain("Elegibilidade: PJ e CLT");
  });

  it("cumprimento e agradecimento não viram lacuna", async () => {
    const { ctx } = await createTestDomain();
    const before = (await ctx.repo.assistant.listGaps()).length;
    const hello = await ask(ctx, "Oi, bom dia!");
    expect(answerText(hello)).toContain("Posso ajudar");
    const thanks = await ask(ctx, "Obrigado!");
    expect(answerText(thanks)).toContain("Por nada");
    expect(routeOf(hello)).toBeUndefined();
    expect((await ctx.repo.assistant.listGaps()).length).toBe(before);
  });
});

describe("encaminhamento e lacunas", () => {
  it("pergunta fora da base encaminha para o contato padrão e registra a lacuna uma vez", async () => {
    const { ctx } = await createTestDomain();
    const question = "Posso levar meu cachorro para o escritório?";
    const events = await ask(ctx, question);
    const route = routeOf(events);
    expect(route?.personId).toBe("thiago-stepanoff");
    expect(route?.name).toBe("Thiago Stepanoff");
    expect(route?.channel).toBe("chat da equipe");
    expect(route?.question).toBe(question);
    expect(answerText(events)).toContain("Fale com Thiago Stepanoff");

    await ask(ctx, "posso levar meu cachorro para o escritorio");
    const gaps = (await ctx.repo.assistant.listGaps()).filter((g) => g.question.toLowerCase().includes("cachorro"));
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ askedById: ASKER, status: "aberta", routedToId: "thiago-stepanoff" });
  });

  it("usa os temas do Quem é quem para achar a pessoa", async () => {
    const { ctx } = await createTestDomain();
    expect(routeOf(await ask(ctx, "Quem cuida do PDI?"))?.personId).toBe("guilherme-bonfitto");
    expect(routeOf(await ask(ctx, "Quem é o responsável pelos acessos?"))?.personId).toBe("alessandro-benetti");
  });

  it("mascara dados pessoais antes de responder e de registrar", async () => {
    const { ctx } = await createTestDomain();
    const events = await ask(ctx, "Meu CPF 123.456.789-09 pode ir no crachá do cachorro?");
    expect(lastMeta(events)?.question).toBe("Meu CPF [CPF] pode ir no crachá do cachorro?");
    const gaps = await ctx.repo.assistant.listGaps();
    expect(gaps.some((g) => g.question.includes("123.456"))).toBe(false);
    expect(gaps.some((g) => g.question.includes("[CPF]"))).toBe(true);
  });
});

describe("modo LLM (provedor simulado)", () => {
  it("repassa o streaming com o prompt, os trechos e o histórico mascarado", async () => {
    const { ctx } = await createTestDomain();
    const llm = new FakeLlm({ chunks: ["Para lançar", " uma despesa, abra o VExpenses."] });
    const events = await ask(ctx, "Como lanço uma despesa de viagem no VExpenses?", { ...localNow(), provider: llm }, [
      { role: "user", content: "Meu e-mail é ana@pessoal.example" },
      { role: "assistant", content: "Certo." },
    ]);
    expect(lastMeta(events)?.mode).toBe("llm");
    expect(answerText(events)).toBe("Para lançar uma despesa, abra o VExpenses.");
    const call = llm.calls[0]!;
    expect(call.system).toContain("Você é o Assistente Monoda");
    expect(call.system).toContain('<trecho id="kb:como-lancar-despesa"');
    expect(call.messages.at(-1)).toEqual({ role: "user", content: "Como lanço uma despesa de viagem no VExpenses?" });
    expect(call.messages[0]?.content).toBe("Meu e-mail é [e-mail]");
  });

  it("[SEM_RESPOSTA] vira encaminhamento, mesmo quebrado em pedaços", async () => {
    const { ctx } = await createTestDomain();
    const llm = new FakeLlm({ chunks: ["  [SEM_", "RESPOSTA]"] });
    const events = await ask(ctx, "Qual é a política de viagens?", { ...localNow(), provider: llm });
    expect(routeOf(events)).toBeDefined();
    expect(answerText(events)).not.toContain("SEM_RESPOSTA");
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("erro do provedor: responde em modo local", async () => {
    const { ctx } = await createTestDomain();
    const events = await ask(ctx, "Como funciona o apontamento de horas?", { ...localNow(), provider: new FakeLlm({ fail: true }) });
    expect(events.filter((e) => e.type === "meta").map((e) => (e as { mode: string }).mode)).toEqual(["llm", "local"]);
    expect(answerText(events)).toContain("Enviar semana");
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("timeout: responde em modo local", async () => {
    const { ctx } = await createTestDomain();
    const events = await ask(ctx, "Como funciona o apontamento de horas?", {
      ...localNow(),
      provider: new FakeLlm({ hang: true }),
      timeoutMs: 30,
    });
    expect(lastMeta(events)?.mode).toBe("local");
    expect(answerText(events)).toContain("Enviar semana");
  });
});

describe("conteúdo vivo e isolamento", () => {
  it("trocar o plano de saúde muda a resposta sem editar artigo", async () => {
    const { ctx } = await createTestDomain();
    await changeBenefitProvider(
      ctx,
      {
        category: "saude",
        providerName: "Vida Plena Saúde",
        validFrom: "2026-10-01",
        summaryMd: "Plano de saúde empresarial **Vida Plena Saúde**, com cobertura nacional.",
        howToUseMd: "1. Baixe o aplicativo Vida Plena.\n2. Entre com o número da carteirinha.",
        eligibleRegimes: ["PJ", "CLT"],
        isExample: true,
      },
      RH,
    );
    const events = await ask(ctx, "Qual é o nosso plano de saúde e como eu uso?");
    expect(lastMeta(events)?.sources[0]?.title).toBe("Plano de saúde: Vida Plena Saúde");
    expect(answerText(events)).toContain("Vida Plena Saúde");
    expect(answerText(events)).not.toContain("Bradesco");
  });

  it("nunca lê casos, fichas, documentos ou contratos (D-OB-06)", async () => {
    const { ctx } = await createTestDomain();
    const forbidden = new Set(["cases", "tasks", "forms", "documents", "contracts"]);
    const repo = new Proxy(ctx.repo, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && forbidden.has(prop)) throw new Error(`acesso proibido a ${prop}`);
        return Reflect.get(target, prop, receiver) as unknown;
      },
    });
    const guarded = { ...ctx, repo };
    const answered = await collect(answerQuestion(guarded, { question: "Como envio minha nota fiscal do mês como PJ?", personId: ASKER }, localNow()));
    expect(answered.at(-1)).toEqual({ type: "done" });
    const routed = await collect(answerQuestion(guarded, { question: "Posso levar meu cachorro?", personId: ASKER }, localNow()));
    expect(routeOf(routed)).toBeDefined();
  });
});
