import { beforeAll, describe, expect, it } from "vitest";

import { createTestDomain } from "@/domain/__tests__/helpers";
import { getAssistantIndex, type AssistantIndex } from "@/server/assistant/index";
import { retrieve } from "@/server/assistant/retrieve";
import { queryTerms, stem } from "@/server/assistant/text";

let index: AssistantIndex;

beforeAll(async () => {
  const { ctx } = await createTestDomain();
  index = await getAssistantIndex(ctx);
});

describe("busca do assistente (seção 10.5)", () => {
  it.each([
    ["Como lanço uma despesa de viagem no VExpenses?", "kb:como-lancar-despesa"],
    ["Qual é o nosso plano de saúde e como eu uso?", "beneficio:saude-bradesco"],
    ["Com quem eu falo sobre o meu notebook?", "kb:meu-notebook"],
    ["Como funciona o apontamento de horas?", "kb:apontamento-de-horas"],
    ["Preciso de aprovação para comprar passagem?", "kb:como-solicitar-viagem"],
    ["Como envio minha nota fiscal do mês como PJ?", "kb:nota-fiscal-pj"],
    ["Tenho que fazer o treinamento de compliance?", "kb:treinamento-compliance"],
    ["O que acontece no meu primeiro dia?", "kb:seu-primeiro-dia"],
  ])("%s → %s", (question, expected) => {
    const result = retrieve(index, question);
    expect(result.hits[0]?.doc.id).toBe(expected);
    expect(result.confident).toBe(true);
  });

  it.each([
    "Posso levar meu cachorro para o escritório?",
    "Tem estacionamento conveniado perto do escritório?",
    "A Monoda apoia curso de idiomas?",
    "Como funciona o plano de carreira?",
    "Qual o valor do vale-refeição?",
    "Tem plano odontológico?",
    "Como peço férias?",
  ])("fora da base, encaminha: %s", (question) => {
    expect(retrieve(index, question).confident).toBe(false);
  });

  it("outras perguntas da base também respondem", () => {
    for (const [question, expected] of [
      ["Qual o prazo do reembolso?", "kb:reembolso-fluxo-e-prazos"],
      ["Uber é reembolsável em viagem?", "kb:o-que-e-reembolsavel-em-viagem"],
      ["Como acesso o Microsoft 365?", "kb:acessos-e-ferramentas"],
      ["O que mudou na política de viagens?", "politica:politica-de-viagens"],
      ["Bom dia! Como lanço uma despesa?", "kb:como-lancar-despesa"],
      ["Qual o horário do primeiro dia?", "primeiro-dia"],
    ] as const) {
      const result = retrieve(index, question);
      expect(result.hits[0]?.doc.id, question).toBe(expected);
      expect(result.confident, question).toBe(true);
    }
  });

  it("normaliza acento, plural e flexão", () => {
    expect(stem("lanço")).toBe(stem("lançar"));
    expect(queryTerms("Lançamento das DESPESAS")).toEqual(queryTerms("lançar despesa"));
    expect(queryTerms("viajar")).toEqual(queryTerms("viagens"));
    expect(queryTerms("Bom dia, tudo bem?")).toEqual([]);
  });
});
