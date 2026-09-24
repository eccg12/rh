/**
 * Leituras de um caso: detalhe para o RH (seção 9.2), jornada e etapas para quem entra (seção 9.3).
 * Dados sensíveis saem mascarados; o valor completo só via `revealSensitive` (com auditoria).
 */
import { company } from "@/config/company";
import { REJECTION_REASONS } from "@/config/documents";
import { formForRegime } from "@/config/forms";
import { formatDate, formatDateTime, spDateKey, daysBetweenKeys } from "@/lib/dates";
import { firstName, maskCnpj, maskCpf, maskGeneric } from "@/lib/format";

import type { DomainContext } from "../context";
import { DomainError } from "../context";
import type { FieldDef, FormSchema, Owner, Person, StageId, TaskStatus } from "../schemas";
import { AUTOMATION_ACTOR } from "../schemas";
import { describeAudit, type TimelineEntry } from "../timeline";
import { buildCaseView, documentState, loadCaseSnapshot, type CaseView, type StageView, type TaskView } from "../workflow-engine";
import { currentPolicies } from "./content";
import { suggestedCorporateEmail } from "./onboarding";

export const OWNER_LABELS: Record<Owner, string> = {
  new_joiner: "New joiner",
  rh: "RH",
  ti: "TI",
  gestor: "Gestor",
};

// ---------------------------------------------------------------------------------------------
// Mascaramento da ficha
// ---------------------------------------------------------------------------------------------

export interface MaskedField {
  id: string;
  path: string;
  label: string;
  type: FieldDef["type"];
  display: string;
  sensitive: boolean;
  items?: { index: number; fields: MaskedField[] }[];
}

function maskValue(field: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value === true ? "Sim" : "Não";
  const text = String(value);
  if (!field.sensitive) return field.type === "date" ? formatDate(text) : text;
  if (field.type === "cpf") return maskCpf(text);
  if (field.type === "cnpj") return maskCnpj(text);
  return maskGeneric(text);
}

export function maskFormValues(schema: FormSchema, values: Record<string, unknown>) {
  return schema.sections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields
      .filter((f) => !f.showWhen || values[f.showWhen.fieldId] === f.showWhen.equals)
      .map<MaskedField>((f) => {
        if (f.type === "repeater") {
          const items = Array.isArray(values[f.id]) ? (values[f.id] as Record<string, unknown>[]) : [];
          return {
            id: f.id,
            path: f.id,
            label: f.label,
            type: f.type,
            display: items.length ? `${items.length} ${items.length === 1 ? "item" : "itens"}` : "Nenhum",
            sensitive: !!f.sensitive,
            items: items.map((item, index) => ({
              index,
              fields: (f.fields ?? []).map((sub) => ({
                id: sub.id,
                path: `${f.id}.${index}.${sub.id}`,
                label: sub.label,
                type: sub.type,
                display: maskValue(sub, item[sub.id]),
                sensitive: !!sub.sensitive,
              })),
            })),
          };
        }
        return { id: f.id, path: f.id, label: f.label, type: f.type, display: maskValue(f, values[f.id]), sensitive: !!f.sensitive };
      }),
  }));
}

// ---------------------------------------------------------------------------------------------
// Evidências (seção 9.2)
// ---------------------------------------------------------------------------------------------

export interface EvidenceRow {
  at: string;
  personName: string;
  event: string;
  detail: string;
  version: string;
  origin: "manual" | "automática";
}

export async function caseEvidences(ctx: DomainContext, view: CaseView): Promise<EvidenceRow[]> {
  const snap = view.snapshot;
  const person = snap.person.name;
  const rows: EvidenceRow[] = [];
  const policies = await ctx.repo.policies.listVersions();
  const titleOf = (id: string) => policies.find((p) => p.id === id)?.title ?? id;
  const caseStart = snap.case.createdAt;

  for (const ack of snap.policyAcks.filter((a) => a.caseId === snap.case.id || a.acknowledgedAt >= caseStart)) {
    rows.push({
      at: ack.acknowledgedAt,
      personName: person,
      event: ack.policyId === "aviso-de-privacidade" ? "Aviso de privacidade aceito" : "Política aceita",
      detail: titleOf(ack.policyId),
      version: `v${ack.version}`,
      origin: "manual",
    });
  }
  for (const v of snap.videoViews) {
    rows.push({
      at: v.watchedAt,
      personName: person,
      event: "Vídeo de compliance assistido",
      detail: v.simulated ? "Registrado pelo atalho de demonstração" : snap.video.title,
      version: `vídeo v${v.version}`,
      origin: "manual",
    });
  }
  snap.quizAttempts.forEach((a, i) => {
    rows.push({
      at: a.answeredAt,
      personName: person,
      event: `Quiz de compliance, tentativa ${i + 1}`,
      detail: `Nota ${a.score}% (${a.passed ? "aprovado" : "abaixo da nota mínima"})`,
      version: `quiz v${a.quizVersion}, vídeo v${a.videoVersion ?? "—"}`,
      origin: "manual",
    });
  });
  const audit = await ctx.repo.audit.listByCase(snap.case.id);
  for (const e of audit.filter((x) => x.type === "evidence.recorded")) {
    rows.push({
      at: e.at,
      personName: person,
      event: "Comprovante de treinamento emitido",
      detail: String(e.payload?.code ?? ""),
      version: `quiz v${String(e.payload?.quizVersion ?? "—")}, vídeo v${String(e.payload?.videoVersion ?? "—")}`,
      origin: "automática",
    });
  }
  for (const b of snap.benefitAcks) {
    rows.push({ at: b.acknowledgedAt, personName: person, event: "Ciência dos benefícios", detail: b.planIds.join(", "), version: "—", origin: "manual" });
  }
  const contract = snap.contract;
  if (contract?.sentAt) {
    rows.push({
      at: contract.sentAt,
      personName: person,
      event: "Contrato enviado para assinatura",
      detail: contract.mode === "customizado" ? (contract.fileName ?? "Contrato customizado") : (contract.templateId ?? "Modelo"),
      version: contract.signatureRef ?? "—",
      origin: "manual",
    });
  }
  if (contract?.signedAt) {
    rows.push({
      at: contract.signedAt,
      personName: person,
      event: "Contrato assinado",
      detail: `Código de verificação ${contract.verificationCode ?? "—"}`,
      version: contract.signatureRef ?? "—",
      origin: "manual",
    });
  }
  for (const eq of snap.equipment.filter((e) => e.termAcceptedAt)) {
    rows.push({
      at: eq.termAcceptedAt!,
      personName: person,
      event: "Termo de responsabilidade aceito",
      detail: `${eq.assetTag}, ${eq.model}`,
      version: `termo v${eq.termVersion ?? 1}`,
      origin: "manual",
    });
  }
  const checkin = view.tasks.find((t) => t.def.id === "primeiro-dia-checkin")?.instance.completedAt;
  if (checkin) rows.push({ at: checkin, personName: person, event: "Check-in do primeiro dia", detail: "—", version: "—", origin: "manual" });
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

export function evidencesToCsv(rows: EvidenceRow[]): string {
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["pessoa", "evento", "detalhe", "versão", "data/hora (São Paulo)", "origem"];
  const lines = rows.map((r) => [r.personName, r.event, r.detail, r.version, formatDateTime(r.at), r.origin].map(esc).join(";"));
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------------------------
// Detalhe do caso (RH)
// ---------------------------------------------------------------------------------------------

function taskRow(t: TaskView, people: Map<string, Person>, view: CaseView) {
  const snap = view.snapshot;
  let detail: string | undefined;
  if (t.def.id === "documentos" || t.def.id === "revisao-documentos") {
    const ds = documentState(snap);
    detail = `${ds.requiredApproved} de ${ds.required.length} aprovados${ds.pendingReview ? `, ${ds.pendingReview} para revisar` : ""}${ds.rejected ? `, ${ds.rejected} rejeitado` : ""}`;
  } else if (t.def.id === "acessos") {
    const g = snap.accessGrants;
    detail = `${g.filter((x) => x.status === "liberado").length} de ${g.length} liberados`;
  } else if (t.def.id === "quiz-compliance" && snap.quizAttempts.length) {
    const last = snap.quizAttempts.at(-1)!;
    detail = `${snap.quizAttempts.length} ${snap.quizAttempts.length === 1 ? "tentativa" : "tentativas"}, última nota ${last.score}%`;
  } else if (t.def.id === "exame-agendar" && t.instance.data?.examDate) {
    detail = `${formatDate(String(t.instance.data.examDate))}, ${String(t.instance.data.clinic ?? "")}`;
  }
  return {
    id: t.def.id,
    title: t.def.title,
    kind: t.def.kind,
    owner: t.def.owner,
    ownerLabel: OWNER_LABELS[t.def.owner],
    status: t.status,
    actionable: t.actionable,
    actionLabel: t.def.actionLabel,
    availableAt: t.instance.availableAt,
    completedAt: t.instance.completedAt,
    completedByName: t.instance.completedById
      ? t.instance.completedById === AUTOMATION_ACTOR
        ? "Automação"
        : (people.get(t.instance.completedById)?.name ?? t.instance.completedById)
      : undefined,
    detail,
  };
}

export type CaseTaskRow = ReturnType<typeof taskRow>;

export async function caseDetail(ctx: DomainContext, caseId: string) {
  const snap = await loadCaseSnapshot(ctx, caseId);
  const view = buildCaseView(snap);
  const [people, projects, templates, equipment, audit] = await Promise.all([
    ctx.repo.people.list(),
    ctx.repo.projects.list(),
    ctx.repo.contracts.listTemplates(),
    ctx.repo.equipment.list(),
    ctx.repo.audit.listByCase(caseId),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const c = snap.case;
  const person = snap.person;
  const schema = formForRegime(c.regime);
  const ds = documentState(snap);
  const notebook = snap.equipment.find((e) => e.type === "notebook");
  const task = (id: string) => view.tasks.find((t) => t.def.id === id);

  return {
    case: {
      id: c.id,
      regime: c.regime,
      status: c.status,
      startDate: c.startDate,
      createdAt: c.createdAt,
      completedAt: c.completedAt,
      needsNotebook: c.needsNotebook,
      contractMode: c.contractMode,
      workflowTitle: snap.workflow.title,
      workflowBadge: snap.workflow.badge,
      extraQuizAttempts: c.extraQuizAttempts,
      leadTimeDays: c.completedAt ? (Date.parse(c.completedAt) - Date.parse(c.createdAt)) / 86_400_000 : null,
    },
    person: {
      id: person.id,
      name: person.name,
      firstName: person.preferredName ?? firstName(person.name),
      jobTitle: person.jobTitle,
      personalEmail: person.personalEmail,
      corporateEmail: person.corporateEmail,
      managerName: person.managerId ? byId.get(person.managerId)?.name : undefined,
      projectName: c.initialProjectId ? projects.find((p) => p.id === c.initialProjectId)?.name : undefined,
      projectClient: c.initialProjectId ? projects.find((p) => p.id === c.initialProjectId)?.client : undefined,
    },
    progress: view.progress,
    currentStage: view.currentStage ? { id: view.currentStage.def.id, title: view.currentStage.def.title } : null,
    nextActionWith: view.nextActionWith ?? null,
    stages: view.stages.map((s) => ({
      id: s.def.id,
      title: s.def.title,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      tasks: s.tasks.map((t) => taskRow(t, byId, view)),
    })),
    form: snap.form
      ? { status: snap.form.status, submittedAt: snap.form.submittedAt, sections: maskFormValues(schema, snap.form.values) }
      : null,
    documents: {
      summary: {
        required: ds.required.length,
        requiredSubmitted: ds.requiredSubmitted,
        requiredApproved: ds.requiredApproved,
        pendingReview: ds.pendingReview,
        rejected: ds.rejected,
      },
      items: ds.items.map((i) => ({
        requirementId: i.requirement.id,
        title: i.requirement.title,
        description: i.requirement.description,
        level: i.level,
        conditionNote: i.requirement.conditionNote,
        current: i.current ?? null,
        history: i.history.filter((h) => h.id !== i.current?.id),
      })),
      aso: snap.documents.filter((d) => d.requirementId === "aso" && !d.supersededById).at(-1) ?? null,
      rejectionReasons: [...REJECTION_REASONS],
    },
    contract: snap.contract
      ? {
          ...snap.contract,
          templateName: templates.find((t) => t.id === snap.contract?.templateId)?.name,
          canSend: task("contrato-preparar")?.actionable ?? false,
          taskStatus: task("contrato-preparar")?.status ?? "bloqueada",
        }
      : null,
    templates: templates.filter((t) => t.regimes.includes(c.regime)),
    equipment: {
      corporateEmail: person.corporateEmail ?? null,
      suggestedEmail: suggestedCorporateEmail(person.name),
      emailTask: task("email-corporativo")?.status ?? "bloqueada",
      notebookTask: task("notebook-atribuir")?.status ?? "dispensada",
      termTask: task("notebook-termo")?.status ?? "dispensada",
      accessTask: task("acessos")?.status ?? "bloqueada",
      notebook: notebook ?? null,
      availableNotebooks: equipment.filter((e) => e.type === "notebook" && e.status === "disponivel"),
      accesses: snap.accessGrants,
    },
    exam: task("exame-agendar")
      ? {
          status: task("exame-agendar")!.status as TaskStatus,
          examDate: task("exame-agendar")!.instance.data?.examDate as string | undefined,
          clinic: task("exame-agendar")!.instance.data?.clinic as string | undefined,
          asoStatus: task("exame-aso")?.status ?? "bloqueada",
        }
      : null,
    accounting: task("envio-contabilidade")
      ? { status: task("envio-contabilidade")!.status, completedAt: task("envio-contabilidade")!.instance.completedAt }
      : null,
    quiz: {
      attempts: snap.quizAttempts.length,
      allowed: snap.quiz.maxAttempts + c.extraQuizAttempts,
      passed: snap.quizAttempts.some((a) => a.passed),
    },
    timeline: audit
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e): TimelineEntry => describeAudit(e, byId)),
    evidences: await caseEvidences(ctx, view),
  };
}

export type CaseDetail = Awaited<ReturnType<typeof caseDetail>>;

// ---------------------------------------------------------------------------------------------
// Jornada (new joiner)
// ---------------------------------------------------------------------------------------------

export type StationState = "concluida" | "atual" | "aguardando" | "disponivel" | "bloqueada";

function stationState(stage: StageView, view: CaseView): { state: StationState; current: boolean } {
  const current = view.joinerStage?.def.id === stage.def.id;
  if (stage.status === "concluida") return { state: "concluida", current: false };
  if (current) return { state: stage.hasJoinerAction ? "atual" : "aguardando", current: true };
  if (stage.hasJoinerAction) return { state: "disponivel", current: false };
  if (stage.waitingOnMonoda) return { state: "aguardando", current: false };
  return { state: "bloqueada", current: false };
}

export function stageHref(stageId: StageId): string {
  return `/onboarding/etapa/${stageId}`;
}

function joinerTask(t: TaskView) {
  return {
    id: t.def.id,
    title: t.def.title,
    description: t.def.description,
    owner: t.def.owner,
    ownerLabel: OWNER_LABELS[t.def.owner],
    status: t.status,
    actionable: t.actionable,
    minutes: t.minutes,
    actionLabel: t.def.actionLabel ?? "Abrir",
    href: stageHref(t.stageId),
  };
}

export async function journey(ctx: DomainContext, caseId: string) {
  const snap = await loadCaseSnapshot(ctx, caseId);
  const view = buildCaseView(snap);
  const rh = await ctx.repo.people.get(company.rhContactPersonId);
  const today = ctx.clock.todayKey();
  const current = view.joinerStage;
  const next = view.nextJoinerTask;
  const docs = documentState(snap);

  return {
    person: {
      id: snap.person.id,
      name: snap.person.name,
      firstName: snap.person.preferredName ?? firstName(snap.person.name),
      welcomeSeen: !!snap.person.welcomeSeenAt,
    },
    case: {
      id: snap.case.id,
      regime: snap.case.regime,
      status: snap.case.status,
      startDate: snap.case.startDate,
      completedAt: snap.case.completedAt,
      workflowBadge: snap.workflow.badge,
    },
    today,
    daysUntilStart: daysBetweenKeys(today, snap.case.startDate),
    stations: view.stages.map((s) => ({ id: s.def.id, title: s.def.title, href: stageHref(s.def.id), ...stationState(s, view) })),
    currentStage: current
      ? {
          id: current.def.id,
          title: current.def.title,
          summary: current.def.summary,
          waiting: !current.hasJoinerAction,
          tasks: current.tasks.filter((t) => t.status !== "dispensada").map(joinerTask),
        }
      : null,
    nextStep: next
      ? {
          ...joinerTask(next),
          stageId: next.stageId,
          note:
            next.def.id === "documentos"
              ? `${docs.requiredSubmitted} de ${docs.required.length} enviados`
              : next.def.id === "ficha"
                ? "Seus dados ficam só com o RH."
                : undefined,
        }
      : null,
    progress: view.progress,
    remainingMinutes: view.remainingJoinerMinutes,
    totalStages: view.stages.length,
    rhContact: { name: rh?.name ?? "RH", channel: company.defaultChannel },
    documentsProgress: { submitted: docs.requiredSubmitted, required: docs.required.length },
  };
}

export type Journey = Awaited<ReturnType<typeof journey>>;

// ---------------------------------------------------------------------------------------------
// Etapa (new joiner)
// ---------------------------------------------------------------------------------------------

export async function stageData(ctx: DomainContext, caseId: string, stageId: StageId) {
  const snap = await loadCaseSnapshot(ctx, caseId);
  const view = buildCaseView(snap);
  const stage = view.stages.find((s) => s.def.id === stageId);
  if (!stage) throw new DomainError("Etapa não encontrada.", "NOT_FOUND");
  const state = stationState(stage, view);
  const tasks = stage.tasks.filter((t) => t.status !== "dispensada").map(joinerTask);
  const base = {
    stage: { id: stage.def.id, title: stage.def.title, summary: stage.def.summary, status: stage.status, ...state },
    tasks,
    person: { id: snap.person.id, firstName: snap.person.preferredName ?? firstName(snap.person.name), name: snap.person.name },
    case: { id: snap.case.id, regime: snap.case.regime, startDate: snap.case.startDate, status: snap.case.status, createdAt: snap.case.createdAt },
    stations: view.stages.map((s) => ({ id: s.def.id, title: s.def.title, href: stageHref(s.def.id), ...stationState(s, view) })),
    today: ctx.clock.todayKey(),
  };
  const task = (id: string) => view.tasks.find((t) => t.def.id === id);

  switch (stageId) {
    case "cadastro-documentos": {
      const ds = documentState(snap);
      const schema = formForRegime(snap.case.regime);
      const exam = task("exame-agendar");
      return {
        ...base,
        kind: "cadastro-documentos" as const,
        form: {
          schema,
          status: snap.form?.status ?? null,
          submittedAt: snap.form?.submittedAt,
          updatedAt: snap.form?.updatedAt,
          values: snap.form?.status === "enviado" ? null : (snap.form?.values ?? prefill(schema, snap.person)),
          summary: snap.form?.status === "enviado" ? maskFormValues(schema, snap.form.values) : null,
          taskStatus: task("ficha")?.status ?? "bloqueada",
        },
        privacyNotice: (await currentPolicies(ctx)).find((p) => p.id === "aviso-de-privacidade") ?? null,
        documents: {
          taskStatus: task("documentos")?.status ?? "bloqueada",
          canSubmit: task("documentos")?.status === "disponivel" || task("documentos")?.status === "em_andamento" || task("documentos")?.status === "aguardando_revisao",
          summary: { required: ds.required.length, submitted: ds.requiredSubmitted, approved: ds.requiredApproved, rejected: ds.rejected },
          items: ds.items.map((i) => ({
            requirementId: i.requirement.id,
            title: i.requirement.title,
            description: i.requirement.description,
            level: i.level,
            conditionNote: i.requirement.conditionNote,
            accept: i.requirement.accept,
            maxSizeMb: i.requirement.maxSizeMb,
            current: i.current
              ? {
                  id: i.current.id,
                  fileName: i.current.fileName,
                  sizeBytes: i.current.sizeBytes,
                  status: i.current.status,
                  submittedAt: i.current.submittedAt,
                  rejectionReason: i.current.rejectionReason,
                }
              : null,
          })),
        },
        exam: exam
          ? {
              status: exam.status,
              examDate: exam.instance.data?.examDate as string | undefined,
              clinic: exam.instance.data?.clinic as string | undefined,
              asoStatus: task("exame-aso")?.status ?? "bloqueada",
              aso: snap.documents.filter((d) => d.requirementId === "aso" && !d.supersededById).at(-1) ?? null,
            }
          : null,
      };
    }
    case "contrato": {
      const templates = await ctx.repo.contracts.listTemplates();
      const contract = snap.contract;
      return {
        ...base,
        kind: "contrato" as const,
        contract: contract
          ? {
              status: contract.status,
              mode: contract.mode,
              name: contract.mode === "customizado" ? (contract.fileName ?? "Contrato customizado") : (templates.find((t) => t.id === contract.templateId)?.name ?? "Contrato"),
              sentAt: contract.sentAt,
              signedAt: contract.signedAt,
              verificationCode: contract.verificationCode,
              declineReason: contract.declineReason,
              isExample: contract.mode === "modelo" ? (templates.find((t) => t.id === contract.templateId)?.isExample ?? true) : false,
            }
          : null,
        canSign: task("contrato-assinar")?.actionable ?? false,
      };
    }
    case "compliance": {
      const quiz = snap.quiz;
      const allowed = quiz.maxAttempts + snap.case.extraQuizAttempts;
      const audit = await ctx.repo.audit.listByCase(caseId);
      const cert = audit.filter((e) => e.type === "evidence.recorded").at(-1);
      const conduct = (await currentPolicies(ctx)).find((p) => p.id === "codigo-de-conduta");
      return {
        ...base,
        kind: "compliance" as const,
        video: {
          ...snap.video,
          watched: snap.videoViews.length > 0,
          watchedAt: snap.videoViews.at(-1)?.watchedAt,
          taskStatus: task("video-compliance")?.status ?? "bloqueada",
        },
        quiz: {
          title: quiz.title,
          version: quiz.version,
          passingScore: quiz.passingScore,
          maxAttempts: allowed,
          attemptsUsed: snap.quizAttempts.length,
          passed: snap.quizAttempts.some((a) => a.passed),
          lastScore: snap.quizAttempts.at(-1)?.score ?? null,
          taskStatus: task("quiz-compliance")?.status ?? "bloqueada",
          canAttempt: task("quiz-compliance")?.actionable ?? false,
          // Sem gabarito: correctIndex e explicação só voltam depois do envio.
          questions: quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
        },
        conduct: conduct
          ? {
              id: conduct.id,
              title: conduct.title,
              version: conduct.version,
              summary: conduct.summary,
              bodyMd: conduct.bodyMd,
              isExample: conduct.isExample,
              acknowledged: snap.policyAcks.some((a) => a.policyId === conduct.id && a.version === conduct.version),
              taskStatus: task("aceite-conduta")?.status ?? "bloqueada",
            }
          : null,
        certificate: cert
          ? {
              code: String(cert.payload?.code ?? ""),
              issuedAt: cert.at,
              score: Number(cert.payload?.score ?? 0),
              quizVersion: Number(cert.payload?.quizVersion ?? quiz.version),
              videoVersion: Number(cert.payload?.videoVersion ?? snap.video.version),
            }
          : null,
      };
    }
    case "politicas-beneficios": {
      const policies = await currentPolicies(ctx);
      const refs = stage.def.tasks.filter((t) => t.kind === "aceite_politica").map((t) => ({ taskId: t.id, policyId: t.ref! }));
      const plans = (await ctx.repo.benefits.list()).filter((p) => p.active && p.eligibleRegimes.includes(snap.case.regime));
      return {
        ...base,
        kind: "politicas-beneficios" as const,
        policies: refs
          .map(({ taskId, policyId }) => {
            const p = policies.find((x) => x.id === policyId);
            if (!p) return null;
            return {
              id: p.id,
              title: p.title,
              version: p.version,
              effectiveFrom: p.effectiveFrom,
              summary: p.summary,
              bodyMd: p.bodyMd,
              isExample: p.isExample,
              acknowledged: snap.policyAcks.some((a) => a.policyId === p.id && a.version === p.version),
              taskStatus: task(taskId)?.status ?? "bloqueada",
            };
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
        benefits: {
          plans,
          confirmed: snap.benefitAcks.length > 0,
          taskStatus: task("beneficios")?.status ?? "bloqueada",
        },
      };
    }
    case "equipamentos-acessos": {
      const term = (await ctx.repo.knowledge.listTerms()).find((t) => t.id === "termo-notebook") ?? null;
      const notebook = snap.equipment.find((e) => e.type === "notebook") ?? null;
      return {
        ...base,
        kind: "equipamentos-acessos" as const,
        corporateEmail: { value: snap.person.corporateEmail ?? null, taskStatus: task("email-corporativo")?.status ?? "bloqueada" },
        needsNotebook: snap.case.needsNotebook,
        notebook,
        term,
        termTaskStatus: task("notebook-termo")?.status ?? "dispensada",
        accesses: snap.accessGrants,
        accessTaskStatus: task("acessos")?.status ?? "bloqueada",
      };
    }
    case "primeiro-dia": {
      const [agenda, directory, people] = await Promise.all([
        ctx.repo.knowledge.getFirstDay(),
        ctx.repo.knowledge.listDirectory(),
        ctx.repo.people.list(),
      ]);
      const checkin = task("primeiro-dia-checkin");
      return {
        ...base,
        kind: "primeiro-dia" as const,
        agenda,
        agendaTaskStatus: task("primeiro-dia-agenda")?.status ?? "bloqueada",
        directory: directory.map((d) => ({ ...d, name: people.find((p) => p.id === d.personId)?.name ?? d.personId })),
        usefulLinks: company.usefulLinks,
        checkin: {
          status: checkin?.status ?? "bloqueada",
          completedAt: checkin?.instance.completedAt,
          startReached: base.today >= snap.case.startDate,
          stagesPending: view.stages
            .filter((s) => ["contrato", "compliance", "politicas-beneficios", "equipamentos-acessos"].includes(s.def.id) && s.status !== "concluida")
            .map((s) => s.def.title),
        },
      };
    }
    case "feedback": {
      const done = view.tasks.filter((t) => t.status === "concluida" && t.def.owner === "new_joiner").map((t) => t.def.title);
      return {
        ...base,
        kind: "feedback" as const,
        taskStatus: task("feedback")?.status ?? "bloqueada",
        survey: snap.survey ?? null,
        completed: snap.case.status === "concluido",
        completedAt: snap.case.completedAt,
        summary: {
          tasksDone: done,
          leadTimeDays: snap.case.completedAt ? (Date.parse(snap.case.completedAt) - Date.parse(snap.case.createdAt)) / 86_400_000 : null,
          startDate: snap.case.startDate,
          createdAt: snap.case.createdAt,
        },
      };
    }
    case "pre-admissao":
    default: {
      const creator = await ctx.repo.people.get(snap.case.createdById);
      return {
        ...base,
        kind: "pre-admissao" as const,
        createdBy: creator?.name ?? "RH",
        createdAt: snap.case.createdAt,
        createdDay: spDateKey(snap.case.createdAt),
      };
    }
  }
}

export type StageData = Awaited<ReturnType<typeof stageData>>;

function prefill(schema: FormSchema, person: Person): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const f of schema.sections.flatMap((s) => s.fields)) {
    if (f.prefillFrom === "name") values[f.id] = person.name;
    if (f.prefillFrom === "personalEmail") values[f.id] = person.personalEmail;
    if (f.prefillFrom === "phone" && person.phone) values[f.id] = person.phone;
  }
  return values;
}
