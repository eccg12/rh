import { beforeEach, describe, expect, it } from "vitest";

import { requiredFor } from "@/config/documents";
import { tickIfNewDay } from "@/domain/automation-engine";
import { advanceDay } from "@/domain/services/demo";
import {
  acceptEquipmentTerm,
  acknowledgePolicy,
  assignEquipment,
  checkIn,
  confirmBenefits,
  declineContract,
  grantAccess,
  markAccountingSent,
  readAgenda,
  reviewDocument,
  scheduleExam,
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

async function approveAll(t: TestDomain, caseId: string) {
  for (const d of await t.ctx.repo.documents.listByCase(caseId)) {
    if (d.status === "enviado" && !d.supersededById) await reviewDocument(t.ctx, d.id, "aprovar", undefined, RH);
  }
}

describe("fluxo PJ do cadastro à conclusão", () => {
  let t: TestDomain;
  beforeEach(async () => {
    t = await createTestDomain();
  });

  it("percorre todas as etapas e conclui o caso", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx);
    let view = await loadCaseView(ctx, caseId);
    expect(view.stages[0]!.status).toBe("concluida");
    expect(view.currentStage?.def.id).toBe("cadastro-documentos");
    expect(view.joinerStage?.def.id).toBe("cadastro-documentos");
    expect(view.nextJoinerTask?.def.id).toBe("ficha");

    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    expect(await simulateAllDocuments(ctx, caseId, personId)).toBe(requiredFor("PJ").length);

    view = await loadCaseView(ctx, caseId);
    // Documentos esperam o RH; o vídeo já está liberado: a etapa atual de quem entra é Compliance.
    expect(view.tasks.find((x) => x.def.id === "documentos")?.status).toBe("aguardando_revisao");
    expect(view.tasks.find((x) => x.def.id === "video-compliance")?.status).toBe("disponivel");
    expect(view.joinerStage?.def.id).toBe("compliance");

    await approveAll(t, caseId);
    await sendContract(ctx, { caseId, mode: "modelo", templateId: "pj-padrao" }, RH);
    await signContract(ctx, caseId, personId);

    await watchVideo(ctx, caseId, personId);
    const quiz = await submitQuiz(ctx, caseId, QUIZ_OK, personId);
    expect(quiz.passed).toBe(true);
    for (const policy of ["codigo-de-conduta", "politica-de-viagens", "politica-de-ti", "rotina-de-trabalho"]) {
      await acknowledgePolicy(ctx, personId, policy, personId);
    }
    await confirmBenefits(ctx, caseId, personId);

    await setCorporateEmail(ctx, caseId, "ana.moura@exemplo.monoda", RH);
    await assignEquipment(ctx, "eq-nb-003", personId, RH);
    await acceptEquipmentTerm(ctx, "eq-nb-003", personId);
    for (const g of (await ctx.repo.access.list()).filter((x) => x.caseId === caseId)) await grantAccess(ctx, g.id, RH);
    await readAgenda(ctx, caseId, personId);

    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "primeiro-dia-checkin")?.status).toBe("bloqueada");
    for (let i = 0; i < 14; i++) await advanceDay(ctx, RH);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "primeiro-dia-checkin")?.status).toBe("disponivel");

    await checkIn(ctx, caseId, personId);
    await submitFeedback(ctx, { caseId, nps: 10, missing: "Nada" }, personId);

    const c = await ctx.repo.cases.get(caseId);
    expect(c?.status).toBe("concluido");
    view = await loadCaseView(ctx, caseId);
    expect(view.progress.percent).toBe(100);
    expect(view.stages.every((s) => s.status === "concluida")).toBe(true);
    expect(await auditOf(ctx, "case.completed", caseId)).toHaveLength(1);
    expect(await outboxByTemplate(ctx, "rh-onboarding-concluido")).toHaveLength(1);
  });

  it("calcula progresso e tempo estimado de quem entra", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx);
    let view = await loadCaseView(ctx, caseId);
    // 1 de 20 tarefas obrigatórias aplicáveis (cadastro).
    expect(view.progress).toMatchObject({ done: 1, total: 20 });
    expect(view.remainingJoinerMinutes).toBe(10 + 10 + 5 + 8 + 5 + 3 + 4 + 3 + 3 + 3 + 2 + 3 + 1 + 2);

    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    view = await loadCaseView(ctx, caseId);
    expect(view.progress.done).toBe(2);
    expect(view.nextJoinerTask?.def.id).toBe("documentos");
  });

  it("dispensa as tarefas de notebook quando não se aplicam", async () => {
    const { ctx } = t;
    const { caseId } = await createAna(ctx, { needsNotebook: false });
    const view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "notebook-atribuir")?.status).toBe("dispensada");
    expect(view.tasks.find((x) => x.def.id === "notebook-termo")?.status).toBe("dispensada");
    expect(view.progress.total).toBe(18);
  });

  it("mostra 'aguardando a Monoda' quando nada depende de quem entra", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx);
    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    await simulateAllDocuments(ctx, caseId, personId);
    await watchVideo(ctx, caseId, personId);
    await submitQuiz(ctx, caseId, QUIZ_OK, personId);
    for (const policy of ["codigo-de-conduta", "politica-de-viagens", "politica-de-ti", "rotina-de-trabalho"]) {
      await acknowledgePolicy(ctx, personId, policy, personId);
    }
    await confirmBenefits(ctx, caseId, personId);
    const view = await loadCaseView(ctx, caseId);
    expect(view.nextJoinerTask).toBeUndefined();
    expect(view.joinerStageWaiting).toBe(true);
    expect(view.joinerStage?.def.id).toBe("cadastro-documentos");
    expect(view.nextActionWith).toBe("rh");
  });

  it("devolve a tarefa ao RH quando o contrato é recusado", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx);
    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    await simulateAllDocuments(ctx, caseId, personId);
    await approveAll(t, caseId);
    await sendContract(ctx, { caseId, mode: "modelo", templateId: "pj-padrao" }, RH);
    await declineContract(ctx, caseId, "Ajustar a data de início", personId);
    const view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "contrato-preparar")?.status).toBe("disponivel");
    expect(view.tasks.find((x) => x.def.id === "contrato-assinar")?.status).toBe("bloqueada");
  });

  it("rejeita arquivo grande ou em formato errado com mensagem que orienta", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx);
    await expect(
      submitDocument(ctx, caseId, "identidade", { fileName: "rg.pdf", mimeType: "application/pdf", sizeBytes: 14 * 1024 * 1024 }, personId),
    ).rejects.toThrow("O arquivo tem 14 MB. O limite é 10 MB: envie em PDF ou reduza a resolução.");
    await expect(
      submitDocument(ctx, caseId, "identidade", { fileName: "rg.docx", mimeType: "application/msword", sizeBytes: 1000 }, personId),
    ).rejects.toThrow("Formato não aceito");
  });

  it("fluxo CLT: exame, ASO e envio à contabilidade", async () => {
    const { ctx } = t;
    const { caseId, personId } = await createAna(ctx, { regime: "CLT", contractTemplateId: "clt-padrao", name: "Caio Mendes", personalEmail: "caio@pessoal.example" });
    let view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "exame-agendar")?.status).toBe("bloqueada");
    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "exame-agendar")?.status).toBe("disponivel");
    expect(view.tasks.find((x) => x.def.id === "exame-aso")?.status).toBe("bloqueada");

    await scheduleExam(ctx, caseId, "2026-10-01", "Clínica de exemplo", RH);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "exame-aso")?.status).toBe("disponivel");
    await submitDocument(ctx, caseId, "aso", { fileName: "aso.pdf", mimeType: "application/pdf", sizeBytes: 90_000 }, personId);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "exame-aso")?.status).toBe("concluida");

    await simulateAllDocuments(ctx, caseId, personId);
    await approveAll(t, caseId);
    await sendContract(ctx, { caseId, mode: "modelo", templateId: "clt-padrao" }, RH);
    await signContract(ctx, caseId, personId);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "envio-contabilidade")?.status).toBe("disponivel");
    await markAccountingSent(ctx, caseId, RH);
    view = await loadCaseView(ctx, caseId);
    expect(view.tasks.find((x) => x.def.id === "envio-contabilidade")?.status).toBe("concluida");
    expect(view.stages.find((s) => s.def.id === "contrato")?.status).toBe("concluida");
    // A virada de hoje já aconteceu no estado base.
    expect(await tickIfNewDay(ctx)).toBe(false);
  });
});
