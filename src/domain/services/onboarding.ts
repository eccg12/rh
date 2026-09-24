/**
 * Comandos do onboarding (seções 7 e 9). Cada comando valida, muda o estado pelo repositório e
 * emite o evento de domínio; o motor de automações faz o resto (liberações, avisos, evidências).
 */
import { company } from "@/config/company";
import { ACCEPT_LABEL, requirementById, requirementsFor } from "@/config/documents";
import { formForRegime } from "@/config/forms";
import { workflowForRegime } from "@/config/workflows";
import { formatBytes, firstName } from "@/lib/format";
import { slugify } from "@/lib/slug";

import { recordAudit } from "../audit";
import { emit } from "../automation-engine";
import type { DomainContext } from "../context";
import { DomainError } from "../context";
import { validateForm, visibleValues, type FormValues } from "../forms";
import type { CreateCaseInput, FileMeta } from "../inputs";
import type { DocumentSubmission, OnboardingCase, Person, TaskInstance } from "../schemas";
import { currentSubmission, loadCaseView, type CaseView, type TaskView } from "../workflow-engine";

// ---------------------------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------------------------

async function uniqueId(ctx: DomainContext, base: string, exists: (id: string) => Promise<boolean>): Promise<string> {
  let id = base;
  let n = 2;
  while (await exists(id)) id = `${base}-${n++}`;
  void ctx;
  return id;
}

export async function getCaseOrThrow(ctx: DomainContext, caseId: string): Promise<OnboardingCase> {
  const c = await ctx.repo.cases.get(caseId);
  if (!c) throw new DomainError("Caso não encontrado.", "NOT_FOUND");
  return c;
}

function taskOf(view: CaseView, taskDefId: string): TaskView {
  const t = view.tasks.find((x) => x.def.id === taskDefId);
  if (!t) throw new DomainError("Esta tarefa não faz parte deste fluxo.", "NOT_FOUND");
  return t;
}

/** Garante que a tarefa está liberada (disponível ou em andamento). */
function requireOpen(view: CaseView, taskDefId: string, message = "Esta etapa ainda não está liberada."): TaskView {
  const t = taskOf(view, taskDefId);
  if (t.status === "concluida") throw new DomainError("Esta tarefa já foi concluída.", "CONFLICT");
  if (t.status !== "disponivel" && t.status !== "em_andamento") throw new DomainError(message, "CONFLICT");
  return t;
}

async function completeManualTask(
  ctx: DomainContext,
  view: CaseView,
  taskDefId: string,
  actorId: string,
  data?: Record<string, unknown>,
): Promise<TaskInstance> {
  const t = requireOpen(view, taskDefId);
  return ctx.repo.tasks.update(t.instance.id, {
    completedAt: ctx.clock.nowIso(),
    completedById: actorId,
    data: { ...(t.instance.data ?? {}), ...(data ?? {}) },
  });
}

// ---------------------------------------------------------------------------------------------
// Cadastro (seção 9.2)
// ---------------------------------------------------------------------------------------------

export interface CreateCaseResult {
  caseId: string;
  personId: string;
  welcomeSentTo: string;
}

export async function createCase(ctx: DomainContext, input: CreateCaseInput, actorId: string): Promise<CreateCaseResult> {
  const { repo, clock } = ctx;
  if (input.startDate < clock.todayKey()) {
    throw new DomainError("A data de início já passou. Escolha hoje ou uma data futura.");
  }
  const manager = await repo.people.get(input.managerId);
  if (!manager) throw new DomainError("Gestor não encontrado.", "NOT_FOUND");
  const email = input.personalEmail.toLowerCase();
  const people = await repo.people.list();
  const existing = people.find((p) => p.personalEmail.toLowerCase() === email);
  if (existing) {
    const active = await repo.cases.getByPerson(existing.id);
    if (active && active.status === "em_andamento") {
      throw new DomainError(`${existing.name} já tem um onboarding em andamento com este e-mail.`, "CONFLICT");
    }
  }
  if (input.contractMode === "modelo") {
    const templates = await repo.contracts.listTemplates();
    const tpl = templates.find((t) => t.id === input.contractTemplateId);
    if (!tpl) throw new DomainError("Modelo de contrato não encontrado.", "NOT_FOUND");
    if (!tpl.regimes.includes(input.regime)) throw new DomainError("Este modelo não se aplica ao regime escolhido.");
  }

  const now = clock.nowIso();
  const personId = await uniqueId(ctx, slugify(input.name) || "pessoa", async (id) => !!(await repo.people.get(id)));
  const person: Person = {
    id: personId,
    name: input.name.trim().replace(/\s+/g, " "),
    roles: ["NEW_JOINER"],
    personalEmail: email,
    phone: input.phone || undefined,
    jobTitle: input.jobTitle,
    regime: input.regime,
    startDate: input.startDate,
    managerId: input.managerId,
  };
  await repo.people.insert(person);

  const workflow = workflowForRegime(input.regime);
  const caseId = await uniqueId(ctx, `caso-${personId}`, async (id) => !!(await repo.cases.get(id)));
  await repo.cases.insert({
    id: caseId,
    personId,
    regime: input.regime,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    createdAt: now,
    createdById: actorId,
    startDate: input.startDate,
    initialProjectId: input.initialProjectId || undefined,
    needsNotebook: input.needsNotebook,
    contractMode: input.contractMode,
    contractTemplateId: input.contractMode === "modelo" ? input.contractTemplateId : undefined,
    status: "em_andamento",
    extraQuizAttempts: 0,
  });

  await repo.tasks.insertMany(
    workflow.stages.flatMap((s) =>
      s.tasks.map<TaskInstance>((t) => ({ id: repo.newId("tsk"), caseId, taskDefId: t.id, status: "bloqueada" })),
    ),
  );
  await repo.contracts.save({
    id: repo.newId("ctr"),
    caseId,
    mode: input.contractMode,
    templateId: input.contractMode === "modelo" ? input.contractTemplateId : undefined,
    status: "rascunho",
  });
  await repo.access.insertMany(
    company.accessSystems.map((s) => ({
      id: repo.newId("acs"),
      personId,
      caseId,
      systemId: s.id,
      system: s.name,
      owner: s.owner,
      status: "pendente" as const,
    })),
  );

  await emit(ctx, {
    type: "case.created",
    caseId,
    personId,
    actorId,
    payload: { regime: input.regime, startDate: input.startDate, jobTitle: input.jobTitle },
  });
  return { caseId, personId, welcomeSentTo: email };
}

// ---------------------------------------------------------------------------------------------
// Ficha cadastral (seção 7.4)
// ---------------------------------------------------------------------------------------------

export async function saveFormDraft(ctx: DomainContext, caseId: string, values: FormValues): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const form = formForRegime(c.regime);
  const current = await ctx.repo.forms.get(caseId);
  if (current?.status === "enviado") throw new DomainError("A ficha já foi enviada.", "CONFLICT");
  await ctx.repo.forms.save({
    caseId,
    formId: form.id,
    values,
    status: "rascunho",
    updatedAt: ctx.clock.nowIso(),
  });
}

export async function submitForm(ctx: DomainContext, caseId: string, values: FormValues, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  requireOpen(view, "ficha");
  const form = formForRegime(c.regime);
  const errors = validateForm(form, values);
  const first = Object.entries(errors)[0];
  if (first) {
    const label = form.sections.flatMap((s) => s.fields).find((f) => f.id === first[0])?.label ?? first[0];
    throw new DomainError(`Confira o campo "${label}": ${first[1]}`);
  }
  const now = ctx.clock.nowIso();
  await ctx.repo.forms.save({
    caseId,
    formId: form.id,
    values: visibleValues(form, values),
    status: "enviado",
    updatedAt: now,
    submittedAt: now,
  });

  const person = await ctx.repo.people.get(c.personId);
  const social = String(values.nomeSocial ?? "").trim();
  await ctx.repo.people.update(c.personId, {
    preferredName: social ? firstName(social) : person?.preferredName,
    phone: String(values.celular ?? person?.phone ?? "") || undefined,
  });

  // Aceite do aviso de privacidade registrado como evidência (versão vigente).
  const versions = (await ctx.repo.policies.listVersions()).filter((p) => p.id === "aviso-de-privacidade");
  const current = versions.sort((a, b) => b.version - a.version)[0];
  if (current && values.aceitePrivacidade === true) {
    await ctx.repo.policyAcks.insert({
      id: ctx.repo.newId("ack"),
      personId: c.personId,
      policyId: current.id,
      version: current.version,
      acknowledgedAt: now,
      caseId,
    });
  }
  await emit(ctx, { type: "form.submitted", caseId, personId: c.personId, actorId, payload: { formId: form.id } });
}

// ---------------------------------------------------------------------------------------------
// Documentos (seção 7.5)
// ---------------------------------------------------------------------------------------------

const EXTENSIONS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

/** Checagem automática da Fase 0: formato e tamanho, sem IA. */
export function checkFile(accept: string[], maxSizeMb: number, file: FileMeta) {
  const lower = file.fileName.toLowerCase();
  const formatOk =
    accept.includes(file.mimeType) || accept.some((m) => (EXTENSIONS[m] ?? []).some((ext) => lower.endsWith(ext)));
  const sizeOk = file.sizeBytes <= maxSizeMb * 1024 * 1024;
  const formats = accept.map((m) => ACCEPT_LABEL[m] ?? m).join(", ");
  const notes = [
    formatOk ? `Formato aceito (${formats}).` : `Formato não aceito. Envie ${formats}.`,
    sizeOk
      ? `Tamanho dentro do limite (${formatBytes(file.sizeBytes)} de ${maxSizeMb} MB).`
      : `O arquivo tem ${formatBytes(file.sizeBytes)}. O limite é ${maxSizeMb} MB: envie em PDF ou reduza a resolução.`,
  ];
  return { formatOk, sizeOk, notes };
}

export async function submitDocument(
  ctx: DomainContext,
  caseId: string,
  requirementId: string,
  file: FileMeta,
  actorId: string,
): Promise<DocumentSubmission> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  const req = requirementById(requirementId);
  if (!req || !req.regimes.includes(c.regime)) throw new DomainError("Documento não pedido para este regime.", "NOT_FOUND");
  if (req.taskOnly) requireOpen(view, "exame-aso", "O envio do ASO é liberado depois do agendamento do exame.");
  else requireOpen(view, "documentos");

  const check = checkFile(req.accept, req.maxSizeMb, file);
  if (!check.formatOk) throw new DomainError(check.notes[0]!);
  if (!check.sizeOk) throw new DomainError(check.notes[1]!);

  const previous = currentSubmission(view.snapshot.documents, requirementId);
  if (previous?.status === "aprovado") throw new DomainError("Este documento já foi aprovado.", "CONFLICT");

  const { ref } = await ctx.storage.put({ caseId, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes });
  const doc: DocumentSubmission = {
    id: ctx.repo.newId("doc"),
    caseId,
    requirementId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    submittedAt: ctx.clock.nowIso(),
    status: "enviado",
    storageRef: ref,
    autoCheck: check,
  };
  await ctx.repo.documents.insert(doc);
  if (previous) await ctx.repo.documents.update(previous.id, { supersededById: doc.id });

  await emit(ctx, {
    type: "document.submitted",
    caseId,
    personId: c.personId,
    actorId,
    payload: { requirementId, title: req.title, fileName: file.fileName, resubmission: !!previous },
  });
  return doc;
}

/** Atalho de demo: envia um arquivo de exemplo para cada documento obrigatório pendente. */
export async function simulateAllDocuments(ctx: DomainContext, caseId: string, actorId: string): Promise<number> {
  const c = await getCaseOrThrow(ctx, caseId);
  const person = await ctx.repo.people.get(c.personId);
  const view = await loadCaseView(ctx, caseId);
  const slug = person ? slugify(person.name) : "arquivo";
  let sent = 0;
  const reqs = requirementsFor(c.regime).filter((r) => r.requirement[c.regime] === "obrigatorio");
  for (const [i, req] of reqs.entries()) {
    const current = currentSubmission(view.snapshot.documents, req.id);
    if (current && current.status !== "rejeitado") continue;
    await submitDocument(
      ctx,
      caseId,
      req.id,
      { fileName: `${req.id}-${slug}.pdf`, mimeType: "application/pdf", sizeBytes: 380_000 + i * 173_000 },
      actorId,
    );
    sent += 1;
  }
  return sent;
}

export async function reviewDocument(
  ctx: DomainContext,
  documentId: string,
  decision: "aprovar" | "rejeitar",
  reason: string | undefined,
  actorId: string,
): Promise<void> {
  const doc = await ctx.repo.documents.get(documentId);
  if (!doc) throw new DomainError("Documento não encontrado.", "NOT_FOUND");
  if (doc.supersededById) throw new DomainError("Este envio foi substituído por um mais recente.", "CONFLICT");
  if (doc.status !== "enviado") throw new DomainError("Este documento já foi revisado.", "CONFLICT");
  const c = await getCaseOrThrow(ctx, doc.caseId);
  const req = requirementById(doc.requirementId);
  const now = ctx.clock.nowIso();
  if (decision === "aprovar") {
    await ctx.repo.documents.update(doc.id, { status: "aprovado", reviewedById: actorId, reviewedAt: now });
  } else {
    if (!reason?.trim()) throw new DomainError("Informe o motivo da rejeição.");
    await ctx.repo.documents.update(doc.id, {
      status: "rejeitado",
      reviewedById: actorId,
      reviewedAt: now,
      rejectionReason: reason.trim(),
    });
  }
  await emit(ctx, {
    type: decision === "aprovar" ? "document.approved" : "document.rejected",
    caseId: c.id,
    personId: c.personId,
    actorId,
    payload: { requirementId: doc.requirementId, title: req?.title, reason: decision === "rejeitar" ? reason?.trim() : undefined },
  });
}

// ---------------------------------------------------------------------------------------------
// Contrato (seção 7.6)
// ---------------------------------------------------------------------------------------------

export async function sendContract(
  ctx: DomainContext,
  input: { caseId: string; mode: "modelo" | "customizado"; templateId?: string; fileName?: string },
  actorId: string,
): Promise<void> {
  const c = await getCaseOrThrow(ctx, input.caseId);
  const view = await loadCaseView(ctx, input.caseId);
  requireOpen(view, "contrato-preparar", "O contrato é liberado depois da aprovação de todos os documentos.");
  const contract = view.snapshot.contract;
  if (!contract) throw new DomainError("Contrato não encontrado.", "NOT_FOUND");
  if (input.mode === "modelo") {
    const tpl = (await ctx.repo.contracts.listTemplates()).find((t) => t.id === input.templateId);
    if (!tpl) throw new DomainError("Escolha um modelo de contrato.");
  } else if (!input.fileName?.trim()) {
    throw new DomainError("Anexe o contrato customizado antes de enviar.");
  }
  const person = view.snapshot.person;
  const { envelopeId } = await ctx.signature.sendForSignature({
    contractId: contract.id,
    documentName: input.mode === "modelo" ? (input.templateId ?? "contrato") : (input.fileName ?? "contrato"),
    signerName: person.name,
    signerEmail: person.personalEmail,
  });
  await ctx.repo.contracts.save({
    ...contract,
    mode: input.mode,
    templateId: input.mode === "modelo" ? input.templateId : undefined,
    fileName: input.mode === "customizado" ? input.fileName?.trim() : undefined,
    status: "enviado",
    sentAt: ctx.clock.nowIso(),
    signatureRef: envelopeId,
    declineReason: undefined,
    declinedAt: undefined,
  });
  await emit(ctx, { type: "contract.sent", caseId: c.id, personId: c.personId, actorId, payload: { mode: input.mode, envelopeId } });
}

export async function signContract(ctx: DomainContext, caseId: string, actorId: string): Promise<{ verificationCode: string }> {
  const c = await getCaseOrThrow(ctx, caseId);
  const contract = await ctx.repo.contracts.getByCase(caseId);
  if (!contract || contract.status !== "enviado") throw new DomainError("Não há contrato aguardando a sua assinatura.", "CONFLICT");
  const person = await ctx.repo.people.get(c.personId);
  const { verificationCode } = await ctx.signature.sign({ envelopeId: contract.signatureRef ?? contract.id, signerName: person?.name ?? "" });
  await ctx.repo.contracts.save({ ...contract, status: "assinado", signedAt: ctx.clock.nowIso(), verificationCode });
  await emit(ctx, { type: "contract.signed", caseId, personId: c.personId, actorId, payload: { verificationCode } });
  return { verificationCode };
}

export async function declineContract(ctx: DomainContext, caseId: string, reason: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const contract = await ctx.repo.contracts.getByCase(caseId);
  if (!contract || contract.status !== "enviado") throw new DomainError("Não há contrato aguardando assinatura.", "CONFLICT");
  if (!reason.trim()) throw new DomainError("Conte o que precisa mudar no contrato.");
  await ctx.repo.contracts.save({ ...contract, status: "recusado", declinedAt: ctx.clock.nowIso(), declineReason: reason.trim() });
  await emit(ctx, { type: "contract.declined", caseId, personId: c.personId, actorId, payload: { reason: reason.trim() } });
}

// ---------------------------------------------------------------------------------------------
// Compliance (seção 7.7)
// ---------------------------------------------------------------------------------------------

export async function watchVideo(ctx: DomainContext, caseId: string, actorId: string, simulated = false): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  requireOpen(view, "video-compliance", "O vídeo é liberado quando todos os documentos obrigatórios forem enviados.");
  const video = await ctx.repo.training.getVideo();
  await ctx.repo.training.insertVideoView({
    id: ctx.repo.newId("vid"),
    personId: c.personId,
    caseId,
    videoId: video.id,
    version: video.version,
    watchedAt: ctx.clock.nowIso(),
    simulated,
  });
  await emit(ctx, { type: "video.watched", caseId, personId: c.personId, actorId, payload: { videoVersion: video.version, simulated } });
}

export interface QuizResult {
  score: number;
  passed: boolean;
  attempt: number;
  attemptsLeft: number;
  passingScore: number;
  questions: { id: string; prompt: string; chosen: number; correctIndex: number; correct: boolean; explanation: string; options: string[] }[];
}

export async function submitQuiz(ctx: DomainContext, caseId: string, answers: number[], actorId: string): Promise<QuizResult> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  requireOpen(view, "quiz-compliance", "O quiz é liberado depois do vídeo.");
  const quiz = await ctx.repo.training.getQuiz();
  const used = view.snapshot.quizAttempts.length;
  const allowed = quiz.maxAttempts + c.extraQuizAttempts;
  if (used >= allowed) throw new DomainError("Você usou todas as tentativas. Fale com o RH para liberar uma nova.", "CONFLICT");
  if (answers.length !== quiz.questions.length) throw new DomainError("Responda todas as perguntas.");

  const questions = quiz.questions.map((q, i) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    chosen: answers[i] ?? -1,
    correctIndex: q.correctIndex,
    correct: answers[i] === q.correctIndex,
    explanation: q.explanation,
  }));
  const score = Math.round((questions.filter((q) => q.correct).length / questions.length) * 100);
  const passed = score >= quiz.passingScore;
  const videoVersion = view.snapshot.videoViews.at(-1)?.version;
  await ctx.repo.training.insertQuizAttempt({
    id: ctx.repo.newId("quiz"),
    personId: c.personId,
    caseId,
    quizId: quiz.id,
    quizVersion: quiz.version,
    videoVersion,
    answers,
    score,
    passed,
    answeredAt: ctx.clock.nowIso(),
  });
  const attemptsLeft = passed ? 0 : allowed - used - 1;
  await emit(ctx, {
    type: passed ? "quiz.passed" : "quiz.failed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { score, attempt: used + 1, attemptsLeft, quizVersion: quiz.version, videoVersion },
  });
  return { score, passed, attempt: used + 1, attemptsLeft, passingScore: quiz.passingScore, questions };
}

export async function grantExtraQuizAttempt(ctx: DomainContext, caseId: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  await ctx.repo.cases.update(caseId, { extraQuizAttempts: c.extraQuizAttempts + 1 });
  await recordAudit(ctx, { type: "quiz.extra_attempt", caseId, personId: c.personId, actorId });
}

// ---------------------------------------------------------------------------------------------
// Políticas e benefícios
// ---------------------------------------------------------------------------------------------

export async function acknowledgePolicy(ctx: DomainContext, personId: string, policyId: string, actorId: string): Promise<void> {
  const versions = (await ctx.repo.policies.listVersions()).filter((p) => p.id === policyId);
  const current = versions.sort((a, b) => b.version - a.version)[0];
  if (!current) throw new DomainError("Política não encontrada.", "NOT_FOUND");
  if (!current.requiresAck) throw new DomainError("Esta política não pede aceite.");
  const acks = await ctx.repo.policyAcks.listByPerson(personId);
  if (acks.some((a) => a.policyId === policyId && a.version === current.version)) return;
  const c = await ctx.repo.cases.getByPerson(personId);
  const caseId = c?.status === "em_andamento" ? c.id : undefined;
  await ctx.repo.policyAcks.insert({
    id: ctx.repo.newId("ack"),
    personId,
    policyId,
    version: current.version,
    acknowledgedAt: ctx.clock.nowIso(),
    caseId,
  });
  await emit(ctx, {
    type: "policy.acknowledged",
    caseId,
    personId,
    actorId,
    payload: { policyId, version: current.version, title: current.title },
  });
}

export async function confirmBenefits(ctx: DomainContext, caseId: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  requireOpen(view, "beneficios", "Os benefícios são liberados depois do quiz de compliance.");
  const plans = (await ctx.repo.benefits.list()).filter((p) => p.active && p.eligibleRegimes.includes(c.regime));
  await ctx.repo.benefitAcks.insert({
    id: ctx.repo.newId("bak"),
    personId: c.personId,
    caseId,
    planIds: plans.map((p) => p.id),
    acknowledgedAt: ctx.clock.nowIso(),
  });
  await emit(ctx, {
    type: "benefits.confirmed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { providers: plans.map((p) => p.providerName) },
  });
}

// ---------------------------------------------------------------------------------------------
// Equipamentos e acessos
// ---------------------------------------------------------------------------------------------

export function suggestedCorporateEmail(name: string): string {
  const parts = slugify(name).split("-").filter(Boolean);
  const local = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : (parts[0] ?? "pessoa");
  return `${local}@${company.emailDomain}`;
}

export async function setCorporateEmail(ctx: DomainContext, caseId: string, email: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  requireOpen(view, "email-corporativo", "O e-mail corporativo é criado depois da assinatura do contrato.");
  const normalized = email.trim().toLowerCase();
  const taken = (await ctx.repo.people.list()).find((p) => p.corporateEmail === normalized && p.id !== c.personId);
  if (taken) throw new DomainError(`O e-mail ${normalized} já é de ${taken.name}.`, "CONFLICT");
  await ctx.repo.people.update(c.personId, { corporateEmail: normalized });
  await completeManualTask(ctx, view, "email-corporativo", actorId, { email: normalized });
  await emit(ctx, {
    type: "task.completed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { taskDefId: "email-corporativo", title: "E-mail corporativo criado", detail: normalized },
  });
}

export async function assignEquipment(ctx: DomainContext, equipmentId: string, personId: string, actorId: string): Promise<void> {
  const item = await ctx.repo.equipment.get(equipmentId);
  if (!item) throw new DomainError("Equipamento não encontrado.", "NOT_FOUND");
  if (item.status !== "disponivel") throw new DomainError(`O ${item.assetTag} não está disponível.`, "CONFLICT");
  const person = await ctx.repo.people.get(personId);
  if (!person) throw new DomainError("Pessoa não encontrada.", "NOT_FOUND");
  const c = await ctx.repo.cases.getByPerson(personId);
  const caseId = c?.status === "em_andamento" ? c.id : undefined;
  if (caseId && item.type === "notebook") {
    const view = await loadCaseView(ctx, caseId);
    const t = view.tasks.find((x) => x.def.id === "notebook-atribuir");
    if (t && t.status === "bloqueada") {
      throw new DomainError("O notebook é atribuído depois da assinatura do contrato.", "CONFLICT");
    }
  }
  await ctx.repo.equipment.update(equipmentId, {
    status: "em_uso",
    assignedToId: personId,
    assignedAt: ctx.clock.nowIso(),
    termAcceptedAt: undefined,
    termVersion: undefined,
  });
  await emit(ctx, {
    type: "equipment.assigned",
    caseId,
    personId,
    actorId,
    payload: { equipmentId, assetTag: item.assetTag, model: item.model, type: item.type },
  });
}

export async function acceptEquipmentTerm(ctx: DomainContext, equipmentId: string, personId: string): Promise<void> {
  const item = await ctx.repo.equipment.get(equipmentId);
  if (!item) throw new DomainError("Equipamento não encontrado.", "NOT_FOUND");
  if (item.assignedToId !== personId) throw new DomainError("Este equipamento não está com você.", "FORBIDDEN");
  if (item.termAcceptedAt) return;
  const term = (await ctx.repo.knowledge.listTerms()).find((t) => t.id === "termo-notebook");
  await ctx.repo.equipment.update(equipmentId, { termAcceptedAt: ctx.clock.nowIso(), termVersion: term?.version ?? 1 });
  const c = await ctx.repo.cases.getByPerson(personId);
  await emit(ctx, {
    type: "equipment.term_accepted",
    caseId: c?.status === "em_andamento" ? c.id : undefined,
    personId,
    actorId: personId,
    payload: { equipmentId, assetTag: item.assetTag, termVersion: term?.version ?? 1 },
  });
}

export async function grantAccess(ctx: DomainContext, grantId: string, actorId: string): Promise<void> {
  const grant = (await ctx.repo.access.list()).find((g) => g.id === grantId);
  if (!grant) throw new DomainError("Acesso não encontrado.", "NOT_FOUND");
  if (grant.status === "liberado") return;
  if (grant.caseId) {
    const view = await loadCaseView(ctx, grant.caseId);
    requireOpen(view, "acessos", "Os acessos são liberados depois da assinatura do contrato.");
  }
  await ctx.repo.access.update(grantId, { status: "liberado", grantedAt: ctx.clock.nowIso(), grantedById: actorId });
  await emit(ctx, {
    type: "access.granted",
    caseId: grant.caseId,
    personId: grant.personId,
    actorId,
    payload: { grantId, system: grant.system },
  });
}

// ---------------------------------------------------------------------------------------------
// CLT (seção 7.3)
// ---------------------------------------------------------------------------------------------

export async function scheduleExam(ctx: DomainContext, caseId: string, examDate: string, clinic: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  await completeManualTask(ctx, view, "exame-agendar", actorId, { examDate, clinic });
  await emit(ctx, {
    type: "task.completed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { taskDefId: "exame-agendar", title: "Exame admissional agendado", detail: `${examDate}, ${clinic}` },
  });
}

export async function markAccountingSent(ctx: DomainContext, caseId: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  await completeManualTask(ctx, view, "envio-contabilidade", actorId);
  await emit(ctx, {
    type: "task.completed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { taskDefId: "envio-contabilidade", title: "Admissão enviada à contabilidade" },
  });
}

// ---------------------------------------------------------------------------------------------
// Primeiro dia e feedback
// ---------------------------------------------------------------------------------------------

export async function readAgenda(ctx: DomainContext, caseId: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  const t = taskOf(view, "primeiro-dia-agenda");
  if (t.status === "concluida") return;
  await completeManualTask(ctx, view, "primeiro-dia-agenda", actorId);
  await emit(ctx, {
    type: "task.completed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { taskDefId: "primeiro-dia-agenda", title: "Agenda do primeiro dia lida" },
  });
}

export async function checkIn(ctx: DomainContext, caseId: string, actorId: string): Promise<void> {
  const c = await getCaseOrThrow(ctx, caseId);
  const view = await loadCaseView(ctx, caseId);
  await completeManualTask(ctx, view, "primeiro-dia-checkin", actorId);
  await emit(ctx, { type: "first_day.checked_in", caseId, personId: c.personId, actorId });
}

export async function submitFeedback(
  ctx: DomainContext,
  input: { caseId: string; nps: number; missing?: string; confusing?: string },
  actorId: string,
): Promise<void> {
  const c = await getCaseOrThrow(ctx, input.caseId);
  const view = await loadCaseView(ctx, input.caseId);
  requireOpen(view, "feedback", "A pesquisa é liberada depois do check-in do primeiro dia.");
  await ctx.repo.surveys.insert({
    caseId: input.caseId,
    nps: input.nps,
    missing: input.missing?.trim() || undefined,
    confusing: input.confusing?.trim() || undefined,
    submittedAt: ctx.clock.nowIso(),
  });
  await emit(ctx, { type: "feedback.submitted", caseId: input.caseId, personId: c.personId, actorId, payload: { nps: input.nps } });
}

// ---------------------------------------------------------------------------------------------
// Portal e dados sensíveis
// ---------------------------------------------------------------------------------------------

export async function markWelcomeSeen(ctx: DomainContext, personId: string): Promise<void> {
  const person = await ctx.repo.people.get(personId);
  if (!person || person.welcomeSeenAt) return;
  await ctx.repo.people.update(personId, { welcomeSeenAt: ctx.clock.nowIso() });
  const c = await ctx.repo.cases.getByPerson(personId);
  await recordAudit(ctx, { type: "welcome.seen", caseId: c?.id, personId, actorId: personId });
}

/** Mostra um dado sensível completo e registra o acesso (seção 7.4). */
export async function revealSensitive(ctx: DomainContext, caseId: string, fieldPath: string, actorId: string): Promise<string> {
  const c = await getCaseOrThrow(ctx, caseId);
  const form = await ctx.repo.forms.get(caseId);
  if (!form) throw new DomainError("A ficha ainda não foi preenchida.", "NOT_FOUND");
  const schema = formForRegime(c.regime);
  const [fieldId, indexRaw, subId] = fieldPath.split(".");
  const field = schema.sections.flatMap((s) => s.fields).find((f) => f.id === fieldId);
  if (!field || !field.sensitive) throw new DomainError("Campo não encontrado.", "NOT_FOUND");
  let value: unknown = form.values[fieldId!];
  let label = field.label;
  if (field.type === "repeater" && indexRaw !== undefined && subId) {
    const item = (Array.isArray(value) ? value : [])[Number(indexRaw)] as FormValues | undefined;
    value = item?.[subId];
    label = `${field.label} ${Number(indexRaw) + 1}: ${field.fields?.find((f) => f.id === subId)?.label ?? subId}`;
  }
  await recordAudit(ctx, {
    type: "sensitive.revealed",
    caseId,
    personId: c.personId,
    actorId,
    payload: { field: fieldPath, label },
  });
  return String(value ?? "");
}
