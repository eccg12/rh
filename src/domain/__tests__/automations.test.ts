import { beforeEach, describe, expect, it } from "vitest";

import { automationRules } from "@/config/automations";
import { changeBenefitProvider, publishPolicyVersion, setRuleEnabled } from "@/domain/services/content";
import { advanceDay } from "@/domain/services/demo";
import {
  acceptEquipmentTerm,
  acknowledgePolicy,
  assignEquipment,
  checkIn,
  confirmBenefits,
  grantAccess,
  readAgenda,
  reviewDocument,
  sendContract,
  setCorporateEmail,
  signContract,
  simulateAllDocuments,
  submitDocument,
  submitFeedback,
  submitForm,
  submitQuiz,
  watchVideo,
} from "@/domain/services/onboarding";
import { loadCaseView } from "@/domain/workflow-engine";

import { auditOf, createAna, createTestDomain, formValuesFor, outboxByTemplate, RH, type TestDomain } from "./helpers";

const QUIZ_OK = [1, 2, 0, 1, 0];
const QUIZ_BAD = [0, 0, 1, 0, 1];
const POLICIES = ["codigo-de-conduta", "politica-de-viagens", "politica-de-ti", "rotina-de-trabalho"];

async function unlockedBy(t: TestDomain, caseId: string, taskDefId: string) {
  const e = (await auditOf(t.ctx, "task.unlocked", caseId)).filter((x) => x.payload?.taskDefId === taskDefId);
  return e.at(-1);
}

async function toDocsSubmitted(t: TestDomain) {
  const r = await createAna(t.ctx);
  await submitForm(t.ctx, r.caseId, await formValuesFor(t.ctx, r.personId), r.personId);
  await simulateAllDocuments(t.ctx, r.caseId, r.personId);
  return r;
}

async function approveAll(t: TestDomain, caseId: string) {
  for (const d of await t.ctx.repo.documents.listByCase(caseId)) {
    if (d.status === "enviado" && !d.supersededById) await reviewDocument(t.ctx, d.id, "aprovar", undefined, RH);
  }
}

async function toSigned(t: TestDomain) {
  const r = await toDocsSubmitted(t);
  await approveAll(t, r.caseId);
  await sendContract(t.ctx, { caseId: r.caseId, mode: "modelo", templateId: "pj-padrao" }, RH);
  await signContract(t.ctx, r.caseId, r.personId);
  return r;
}

async function toPoliciesDone(t: TestDomain, r: { caseId: string; personId: string }) {
  await watchVideo(t.ctx, r.caseId, r.personId);
  await submitQuiz(t.ctx, r.caseId, QUIZ_OK, r.personId);
  for (const p of POLICIES) await acknowledgePolicy(t.ctx, r.personId, p, r.personId);
  await confirmBenefits(t.ctx, r.caseId, r.personId);
}

async function toEquipmentDone(t: TestDomain, r: { caseId: string; personId: string }) {
  await setCorporateEmail(t.ctx, r.caseId, "ana.moura@exemplo.monoda", RH);
  await assignEquipment(t.ctx, "eq-nb-003", r.personId, RH);
  await acceptEquipmentTerm(t.ctx, "eq-nb-003", r.personId);
  for (const g of (await t.ctx.repo.access.list()).filter((x) => x.caseId === r.caseId)) await grantAccess(t.ctx, g.id, RH);
}

describe("regras de automação A01 a A19", () => {
  let t: TestDomain;
  beforeEach(async () => {
    t = await createTestDomain();
  });

  it("A01 envia boas-vindas ao e-mail pessoal, com link que troca a persona", async () => {
    const { caseId } = await createAna(t.ctx);
    const [mail] = await outboxByTemplate(t.ctx, "boas-vindas");
    expect(mail?.to).toBe("ana.moura@pessoal.example");
    expect(mail?.subject).toBe("Boas-vindas à Monoda, Ana");
    expect(mail?.ruleId).toBe("A01");
    expect(mail?.bodyHtml).toContain("/entrar?persona=ana-beatriz-moura&amp;next=%2Fonboarding");
    const sent = await auditOf(t.ctx, "email.sent", caseId);
    expect(sent[0]?.actorId).toBe("automacao");
  });

  it("A02 cria a revisão para o RH e A03 libera o vídeo, cada uma com o seu e-mail", async () => {
    const { caseId } = await toDocsSubmitted(t);
    expect((await unlockedBy(t, caseId, "revisao-documentos"))?.ruleId).toBe("A02");
    expect((await unlockedBy(t, caseId, "video-compliance"))?.ruleId).toBe("A03");
    const [rh] = await outboxByTemplate(t.ctx, "rh-documentos-recebidos");
    expect(rh?.to).toBe("thiago.stepanoff@exemplo.monoda");
    expect(await outboxByTemplate(t.ctx, "compliance-liberado")).toHaveLength(1);
  });

  it("A04 manda o motivo da rejeição a cada rejeição (repetível)", async () => {
    const { caseId, personId } = await toDocsSubmitted(t);
    const residencia = () => t.ctx.repo.documents.listByCase(caseId).then((d) => d.find((x) => x.requirementId === "residencia" && !x.supersededById)!);
    await reviewDocument(t.ctx, (await residencia()).id, "rejeitar", "Ilegível", RH);
    await submitDocument(t.ctx, caseId, "residencia", { fileName: "conta-luz.pdf", mimeType: "application/pdf", sizeBytes: 200_000 }, personId);
    await reviewDocument(t.ctx, (await residencia()).id, "rejeitar", "Documento vencido", RH);
    const mails = await outboxByTemplate(t.ctx, "documento-rejeitado");
    expect(mails).toHaveLength(2);
    expect(mails[0]?.bodyHtml).toContain("Ilegível");
    expect(mails[1]?.bodyHtml).toContain("Documento vencido");
  });

  it("A05 cria \"Preparar e enviar contrato\" quando tudo é aprovado", async () => {
    const { caseId } = await toDocsSubmitted(t);
    await approveAll(t, caseId);
    expect((await unlockedBy(t, caseId, "contrato-preparar"))?.ruleId).toBe("A05");
  });

  it("A06 avisa que o contrato está pronto e libera a assinatura", async () => {
    const { caseId } = await toDocsSubmitted(t);
    await approveAll(t, caseId);
    await sendContract(t.ctx, { caseId, mode: "modelo", templateId: "pj-padrao" }, RH);
    expect(await outboxByTemplate(t.ctx, "contrato-para-assinatura")).toHaveLength(1);
    expect((await unlockedBy(t, caseId, "contrato-assinar"))?.ruleId).toBe("A06");
  });

  it("A07 cria as tarefas de RH/TI, libera a agenda e avisa o RH", async () => {
    const { caseId } = await toSigned(t);
    for (const id of ["email-corporativo", "acessos", "notebook-atribuir", "primeiro-dia-agenda"]) {
      expect((await unlockedBy(t, caseId, id))?.ruleId).toBe("A07");
    }
    const [mail] = await outboxByTemplate(t.ctx, "rh-contrato-assinado");
    expect(mail?.bodyHtml).toContain("Atribuir notebook");
  });

  it("A08 libera o quiz depois do vídeo", async () => {
    const { caseId, personId } = await toDocsSubmitted(t);
    await watchVideo(t.ctx, caseId, personId);
    expect((await unlockedBy(t, caseId, "quiz-compliance"))?.ruleId).toBe("A08");
    expect(await outboxByTemplate(t.ctx, "quiz-liberado")).toHaveLength(1);
  });

  it("A09 registra o comprovante, libera as políticas e envia o código", async () => {
    const { caseId, personId } = await toDocsSubmitted(t);
    await watchVideo(t.ctx, caseId, personId);
    await submitQuiz(t.ctx, caseId, QUIZ_OK, personId);
    const [evidence] = await auditOf(t.ctx, "evidence.recorded", caseId);
    expect(evidence?.payload).toMatchObject({ kind: "comprovante_treinamento", score: 100, quizVersion: 1, videoVersion: 1 });
    const code = String(evidence?.payload?.code);
    expect(code).toMatch(/^CT-\d{6}$/);
    for (const id of ["aceite-conduta", "aceite-viagens", "aceite-ti", "aceite-rotina", "beneficios"]) {
      expect((await unlockedBy(t, caseId, id))?.ruleId).toBe("A09");
    }
    expect((await outboxByTemplate(t.ctx, "quiz-aprovado"))[0]?.bodyHtml).toContain(code);
  });

  it("A10 oferece nova tentativa só enquanto houver tentativas", async () => {
    const { caseId, personId } = await toDocsSubmitted(t);
    await watchVideo(t.ctx, caseId, personId);
    await submitQuiz(t.ctx, caseId, QUIZ_BAD, personId);
    await submitQuiz(t.ctx, caseId, QUIZ_BAD, personId);
    await submitQuiz(t.ctx, caseId, QUIZ_BAD, personId);
    expect(await outboxByTemplate(t.ctx, "quiz-nova-tentativa")).toHaveLength(2);
    await expect(submitQuiz(t.ctx, caseId, QUIZ_OK, personId)).rejects.toThrow("todas as tentativas");
  });

  it("A11 dispara o termo quando o notebook é atribuído", async () => {
    const { caseId, personId } = await toSigned(t);
    await assignEquipment(t.ctx, "eq-nb-003", personId, RH);
    expect((await unlockedBy(t, caseId, "notebook-termo"))?.ruleId).toBe("A11");
    expect((await outboxByTemplate(t.ctx, "termo-notebook"))[0]?.bodyHtml).toContain("MON-NB-003");
  });

  it("A12 avisa uma vez, quando o último acesso é liberado, sem senha", async () => {
    const { caseId } = await toSigned(t);
    const grants = (await t.ctx.repo.access.list()).filter((g) => g.caseId === caseId);
    await grantAccess(t.ctx, grants[0]!.id, RH);
    await grantAccess(t.ctx, grants[1]!.id, RH);
    expect(await outboxByTemplate(t.ctx, "acessos-prontos")).toHaveLength(0);
    await grantAccess(t.ctx, grants[2]!.id, RH);
    const mails = await outboxByTemplate(t.ctx, "acessos-prontos");
    expect(mails).toHaveLength(1);
    expect(mails[0]?.bodyHtml).toContain("Nenhuma senha é enviada por e-mail");
  });

  it("A13 avisa que está tudo pronto quando as etapas 3 a 6 terminam, com cópia ao gestor", async () => {
    const r = await toSigned(t);
    await toPoliciesDone(t, r);
    expect(await outboxByTemplate(t.ctx, "primeiro-dia-pronto")).toHaveLength(0);
    await toEquipmentDone(t, r);
    const mails = await outboxByTemplate(t.ctx, "primeiro-dia-pronto");
    expect(mails).toHaveLength(1);
    expect(mails[0]?.cc).toEqual(["alessandro.benetti@exemplo.monoda"]);
  });

  it("A14 manda o e-mail da véspera uma única vez", async () => {
    await createAna(t.ctx);
    for (let i = 0; i < 12; i++) await advanceDay(t.ctx, RH);
    expect(await outboxByTemplate(t.ctx, "vespera-primeiro-dia")).toHaveLength(0);
    await advanceDay(t.ctx, RH); // véspera (início em 14 dias)
    expect(await outboxByTemplate(t.ctx, "vespera-primeiro-dia")).toHaveLength(1);
    await advanceDay(t.ctx, RH);
    await advanceDay(t.ctx, RH);
    expect(await outboxByTemplate(t.ctx, "vespera-primeiro-dia")).toHaveLength(1);
  });

  it("A15 lembra pendências paradas há 3 dias, a cada 3 dias", async () => {
    await createAna(t.ctx);
    await advanceDay(t.ctx, RH);
    await advanceDay(t.ctx, RH);
    expect(await outboxByTemplate(t.ctx, "lembrete-pendencia")).toHaveLength(0);
    await advanceDay(t.ctx, RH); // 3 dias: ficha e documentos
    expect(await outboxByTemplate(t.ctx, "lembrete-pendencia")).toHaveLength(2);
    await advanceDay(t.ctx, RH);
    await advanceDay(t.ctx, RH);
    expect(await outboxByTemplate(t.ctx, "lembrete-pendencia")).toHaveLength(2);
    await advanceDay(t.ctx, RH); // mais 3 dias
    expect(await outboxByTemplate(t.ctx, "lembrete-pendencia")).toHaveLength(4);
  });

  it("A15 lembra o dono da tarefa (RH para revisão de documentos)", async () => {
    await toDocsSubmitted(t);
    for (let i = 0; i < 3; i++) await advanceDay(t.ctx, RH);
    const mails = await outboxByTemplate(t.ctx, "lembrete-pendencia");
    expect(mails.some((m) => m.to === "thiago.stepanoff@exemplo.monoda" && m.subject === "Lembrete: Revisar documentos")).toBe(true);
  });

  it("A16 libera a pesquisa depois do check-in e A17 avisa o RH na conclusão", async () => {
    const r = await toSigned(t);
    await toPoliciesDone(t, r);
    await toEquipmentDone(t, r);
    await readAgenda(t.ctx, r.caseId, r.personId);
    for (let i = 0; i < 14; i++) await advanceDay(t.ctx, RH);
    await checkIn(t.ctx, r.caseId, r.personId);
    expect((await unlockedBy(t, r.caseId, "feedback"))?.ruleId).toBe("A16");
    expect(await outboxByTemplate(t.ctx, "pesquisa-onboarding")).toHaveLength(1);
    await submitFeedback(t.ctx, { caseId: r.caseId, nps: 9, missing: "Mapa do escritório" }, r.personId);
    const [mail] = await outboxByTemplate(t.ctx, "rh-onboarding-concluido");
    expect(mail?.to).toBe("thiago.stepanoff@exemplo.monoda");
    expect(mail?.bodyHtml).toContain("Mapa do escritório");
  });

  it("A18 cria re-aceite pendente e avisa todos os ativos", async () => {
    await createAna(t.ctx);
    await publishPolicyVersion(
      t.ctx,
      { policyId: "politica-de-viagens", summary: "Resumo novo da política.", bodyMd: "Texto novo da política de viagens, versão três.", changelog: "Novo teto de hospedagem.", effectiveFrom: "2026-10-01" },
      RH,
    );
    const mails = await outboxByTemplate(t.ctx, "politica-nova-versao");
    expect(mails.length).toBe(5); // 4 da equipe + Ana
    const [reack] = await auditOf(t.ctx, "policy.reack_required");
    expect(reack?.payload).toMatchObject({ policyId: "politica-de-viagens", version: 3 });
    const acks = await t.ctx.repo.policyAcks.listByPerson("enzo-craveiro");
    expect(acks.some((a) => a.policyId === "politica-de-viagens" && a.version === 3)).toBe(false);
  });

  it("A19 comunica a troca de benefício e reindexa o assistente", async () => {
    const before = await t.ctx.repo.meta.getContentVersion();
    await changeBenefitProvider(
      t.ctx,
      { category: "saude", providerName: "SulAmérica Saúde", validFrom: "2026-11-01", summaryMd: "Plano SulAmérica.", howToUseMd: "1. Baixe o app.", eligibleRegimes: ["PJ", "CLT"] },
      RH,
    );
    const mails = await outboxByTemplate(t.ctx, "beneficio-mudou");
    expect(mails.length).toBe(4);
    expect(mails[0]?.bodyHtml).toContain("SulAmérica Saúde");
    expect(await t.ctx.repo.meta.getContentVersion()).toBeGreaterThan(before);
    expect(await auditOf(t.ctx, "assistant.reindexed")).toHaveLength(1);
    const plans = await t.ctx.repo.benefits.list();
    expect(plans.find((p) => p.providerName === "Bradesco Saúde")?.active).toBe(false);
  });
});

describe("comportamento do motor", () => {
  let t: TestDomain;
  beforeEach(async () => {
    t = await createTestDomain();
  });

  it("é idempotente: reenviar documentos não dispara A02/A03 de novo", async () => {
    const { caseId, personId } = await toDocsSubmitted(t);
    const doc = (await t.ctx.repo.documents.listByCase(caseId)).find((d) => d.requirementId === "identidade")!;
    await reviewDocument(t.ctx, doc.id, "rejeitar", "Ilegível", RH);
    await submitDocument(t.ctx, caseId, "identidade", { fileName: "rg-novo.pdf", mimeType: "application/pdf", sizeBytes: 300_000 }, personId);
    expect(await auditOf(t.ctx, "documents.all_submitted", caseId)).toHaveLength(2);
    expect(await outboxByTemplate(t.ctx, "rh-documentos-recebidos")).toHaveLength(1);
    expect(await outboxByTemplate(t.ctx, "compliance-liberado")).toHaveLength(1);
    expect((await t.ctx.repo.automations.listFirings()).filter((f) => f.ruleId === "A02")).toHaveLength(1);
  });

  it("regra desligada não dispara, mas o fluxo continua", async () => {
    await setRuleEnabled(t.ctx, "A01", false, RH);
    const { caseId } = await createAna(t.ctx);
    expect(await outboxByTemplate(t.ctx, "boas-vindas")).toHaveLength(0);
    expect((await t.ctx.repo.automations.listFirings()).some((f) => f.ruleId === "A01")).toBe(false);
    const view = await loadCaseView(t.ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "ficha")?.status).toBe("disponivel");
  });

  it("desligar A03 mantém a liberação do vídeo, sem e-mail e sem atribuição", async () => {
    await setRuleEnabled(t.ctx, "A03", false, RH);
    const { caseId } = await toDocsSubmitted(t);
    expect(await outboxByTemplate(t.ctx, "compliance-liberado")).toHaveLength(0);
    const unlock = await unlockedBy(t, caseId, "video-compliance");
    expect(unlock).toBeDefined();
    expect(unlock?.ruleId).toBeUndefined();
  });

  it("toda ação automática é registrada com o ator 'automacao'", async () => {
    await toSigned(t);
    const audit = await t.ctx.repo.audit.list();
    for (const type of ["email.sent", "task.unlocked", "evidence.recorded"]) {
      expect(audit.filter((e) => e.type === type).every((e) => e.actorId === "automacao")).toBe(true);
    }
    expect(audit.filter((e) => e.type === "documents.all_submitted").every((e) => e.actorId === "ana-beatriz-moura")).toBe(true);
  });

  it("registra cada etapa concluída uma única vez", async () => {
    const r = await toSigned(t);
    await toPoliciesDone(t, r);
    const stages = (await auditOf(t.ctx, "stage.completed", r.caseId)).map((e) => e.payload?.stageId);
    expect(new Set(stages).size).toBe(stages.length);
    expect(stages).toEqual(expect.arrayContaining(["pre-admissao", "cadastro-documentos", "contrato", "compliance", "politicas-beneficios"]));
  });

  it("todas as regras do plano existem e estão habilitadas por padrão", () => {
    expect(automationRules.map((r) => r.id)).toEqual(Array.from({ length: 19 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`));
    expect(automationRules.every((r) => r.enabled)).toBe(true);
    expect(automationRules.filter((r) => r.repeatable).map((r) => r.id)).toEqual(["A04", "A10", "A15", "A18"]);
  });
});
