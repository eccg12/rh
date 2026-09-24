/**
 * Motor de automações (seção 8.3).
 *
 * `emit(evento)`:
 *   1. grava o evento na auditoria;
 *   2. reavalia o fluxo do caso (liberações, conclusões, reversões);
 *   3. escolhe as regras habilitadas para o tipo de evento (idempotência por caso e evento,
 *      exceto as `repeatable`);
 *   4. registra cada tarefa liberada como ação automática, atribuída à regra que a nomeia;
 *   5. executa as demais ações das regras (e-mail, evidência, re-aceite, reindexação);
 *   6. emite os eventos derivados (documents.all_submitted, stage.completed, case.completed…).
 * Toda ação automática vai para a auditoria com `actorId: 'automacao'`.
 */
import { automationRules, type AutomationRule, type RecipientRef, type RuleAction, type RuleContext } from "@/config/automations";
import { company } from "@/config/company";
import { requirementById } from "@/config/documents";
import { addDaysKey, daysBetweenKeys, formatDate, formatDateTime, formatDays, formatMinutes, formatWeekdayDate, spDateKey } from "@/lib/dates";
import { firstName } from "@/lib/format";

import { recordAudit } from "./audit";
import type { DomainContext } from "./context";
import { ONCE_PER_CASE, type DomainEventInput } from "./events";
import {
  casePath,
  emailOf,
  joinerEmail,
  ownerPerson,
  portalLink,
  rhContact,
  sendTemplateEmail,
  stagePath,
  type EmailVars,
} from "./notifications";
import { AUTOMATION_ACTOR, SYSTEM_ACTOR, type AuditEvent, type Person, type StageId } from "./schemas";
import {
  buildCaseView,
  documentState,
  loadCaseSnapshot,
  NO_TRANSITIONS,
  reevaluateCase,
  type CaseView,
  type TaskView,
  type Transitions,
} from "./workflow-engine";

const MAX_DEPTH = 16;

// ---------------------------------------------------------------------------------------------
// Regras: estado e idempotência
// ---------------------------------------------------------------------------------------------

export async function isRuleEnabled(ctx: DomainContext, rule: AutomationRule): Promise<boolean> {
  const overrides = await ctx.repo.automations.getEnabledOverrides();
  return overrides[rule.id] ?? rule.enabled;
}

async function enabledRulesFor(ctx: DomainContext, type: string): Promise<AutomationRule[]> {
  const overrides = await ctx.repo.automations.getEnabledOverrides();
  return automationRules.filter((r) => r.on === type && (overrides[r.id] ?? r.enabled));
}

function firingKey(rule: AutomationRule, ev: DomainEventInput, auditId: string): string {
  if (rule.repeatable) return `${rule.id}:${ev.caseId ?? ev.subjectKey ?? "global"}:${auditId}`;
  return `${rule.id}:${ev.caseId ?? ev.subjectKey ?? "global"}`;
}

async function hasFiring(ctx: DomainContext, key: string): Promise<boolean> {
  return (await ctx.repo.automations.listFirings()).some((f) => f.key === key);
}

async function recordFiring(ctx: DomainContext, rule: AutomationRule, key: string, ev: { type: string; caseId?: string }) {
  await ctx.repo.automations.insertFiring({
    id: ctx.repo.newId("fire"),
    ruleId: rule.id,
    key,
    caseId: ev.caseId,
    eventType: ev.type,
    firedAt: ctx.clock.nowIso(),
  });
}

function ruleContext(ev: DomainEventInput, view?: CaseView): RuleContext {
  const snap = view?.snapshot;
  return {
    eventType: ev.type,
    payload: ev.payload ?? {},
    stagesDone: new Set(view?.stages.filter((s) => s.status === "concluida").map((s) => s.def.id) ?? []),
    quizAttemptsLeft: snap
      ? Math.max(0, snap.quiz.maxAttempts + snap.case.extraQuizAttempts - snap.quizAttempts.length)
      : 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Variáveis dos e-mails
// ---------------------------------------------------------------------------------------------

interface ExecScratch {
  evidenceCode?: string;
  task?: TaskView;
  taskDays?: number;
}

function preferredFirstName(p: Person): string {
  return p.preferredName ?? firstName(p.name);
}

async function joinerVars(
  ctx: DomainContext,
  template: string,
  view: CaseView,
  ev: DomainEventInput,
  scratch: ExecScratch,
  recipient: Person,
): Promise<EmailVars> {
  const snap = view.snapshot;
  const person = snap.person;
  const rh = await rhContact(ctx);
  const payload = ev.payload ?? {};
  const link = (stageId: string) => portalLink(ctx, person.id, stagePath(stageId));
  const rhCaseLink = portalLink(ctx, rh.id, casePath(snap.case.id));
  const base: EmailVars = {
    primeiroNome: preferredFirstName(person),
    nomeNewJoiner: person.name,
    dataInicio: formatWeekdayDate(snap.case.startDate),
    contatoRh: rh.name,
    linkCaso: rhCaseLink,
    nomeDestinatario: firstName(recipient.name),
  };
  const firstDay = await ctx.repo.knowledge.getFirstDay();

  switch (template) {
    case "boas-vindas":
      return { ...base, linkPortal: portalLink(ctx, person.id, "/onboarding"), tempoEstimado: formatMinutes(view.remainingJoinerMinutes) };
    case "rh-documentos-recebidos":
      return { ...base, quantidadeDocumentos: String(documentState(snap).required.length), linkCaso: `${rhCaseLink}` };
    case "compliance-liberado":
      return { ...base, duracaoVideo: formatMinutes(Math.ceil(snap.video.durationSec / 60)), linkEtapa: link("compliance") };
    case "documento-rejeitado": {
      const req = requirementById(String(payload.requirementId ?? ""));
      return { ...base, documento: req?.title ?? "Documento", motivo: String(payload.reason ?? "não informado"), linkEtapa: link("cadastro-documentos") };
    }
    case "contrato-para-assinatura":
      return { ...base, linkEtapa: link("contrato") };
    case "rh-contrato-assinado": {
      const open = view.tasks.filter(
        (t) => (t.def.owner === "rh" || t.def.owner === "ti") && (t.status === "disponivel" || t.status === "em_andamento"),
      );
      return { ...base, tarefas: open.map((t) => `- ${t.def.title}`).join("\n") || "- Nenhuma tarefa pendente" };
    }
    case "quiz-liberado":
      return { ...base, notaMinima: `${snap.quiz.passingScore}%`, tentativas: String(snap.quiz.maxAttempts + snap.case.extraQuizAttempts), linkEtapa: link("compliance") };
    case "quiz-aprovado":
      return {
        ...base,
        nota: `${Number(payload.score ?? 0)}%`,
        dataHora: formatDateTime(ctx.clock.now()),
        codigoComprovante: scratch.evidenceCode ?? "—",
        linkEtapa: link("compliance"),
      };
    case "quiz-nova-tentativa": {
      const left = ruleContext(ev, view).quizAttemptsLeft;
      return {
        ...base,
        nota: `${Number(payload.score ?? 0)}%`,
        notaMinima: `${snap.quiz.passingScore}%`,
        tentativasRestantes: `${left} ${left === 1 ? "tentativa" : "tentativas"}`,
        linkEtapa: link("compliance"),
      };
    }
    case "termo-notebook": {
      const nb = snap.equipment.find((e) => e.type === "notebook");
      return { ...base, modelo: nb?.model ?? "notebook", patrimonio: nb?.assetTag ?? "—", linkEtapa: link("equipamentos-acessos") };
    }
    case "acessos-prontos": {
      const systems = snap.accessGrants.filter((g) => g.status === "liberado").map((g) => `- ${g.system}`);
      const corporate = person.corporateEmail ?? "em criação";
      return {
        ...base,
        emailCorporativo: corporate,
        sistemas: [`- E-mail corporativo (Google Workspace)`, ...systems].join("\n"),
        linkEtapa: link("equipamentos-acessos"),
      };
    }
    case "primeiro-dia-pronto":
      return {
        ...base,
        agenda: firstDay.items.map((i) => `- **${i.time}** ${i.title}`).join("\n"),
        linkEtapa: link("primeiro-dia"),
      };
    case "vespera-primeiro-dia":
      return { ...base, horario: firstDay.items[0]?.time ?? "9h", linkEtapa: link("primeiro-dia") };
    case "lembrete-pendencia": {
      const task = scratch.task;
      const days = scratch.taskDays ?? 3;
      const forJoiner = task?.def.owner === "new_joiner";
      return {
        ...base,
        tarefa: task?.def.title ?? "Tarefa",
        pessoa: forJoiner ? "sua" : person.name,
        diasPendente: `${days} ${days === 1 ? "dia" : "dias"}`,
        link: forJoiner ? link(task?.stageId ?? "cadastro-documentos") : portalLink(ctx, recipient.id, casePath(snap.case.id)),
      };
    }
    case "pesquisa-onboarding":
      return { ...base, linkEtapa: link("feedback") };
    case "rh-onboarding-concluido": {
      const survey = snap.survey;
      const lead = snap.case.completedAt
        ? (new Date(snap.case.completedAt).getTime() - new Date(snap.case.createdAt).getTime()) / 86_400_000
        : 0;
      return {
        ...base,
        leadTime: formatDays(lead),
        nota: survey ? String(survey.nps) : "—",
        faltou: survey?.missing?.trim() || "—",
        confuso: survey?.confusing?.trim() || "—",
      };
    }
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------------------------
// Execução de ações
// ---------------------------------------------------------------------------------------------

async function activePeople(ctx: DomainContext): Promise<Person[]> {
  const [people, cases] = await Promise.all([ctx.repo.people.list(), ctx.repo.cases.list()]);
  return people.filter((p) => {
    if (p.roles.some((r) => r !== "NEW_JOINER")) return true;
    return cases.some((c) => c.personId === p.id && c.status !== "cancelado");
  });
}

async function resolveCaseRecipient(ctx: DomainContext, ref: RecipientRef, view: CaseView): Promise<Person | undefined> {
  const snap = view.snapshot;
  switch (ref) {
    case "new_joiner":
      return snap.person;
    case "rh":
      return ctx.repo.people.get(company.rhContactPersonId);
    case "ti":
      return ctx.repo.people.get(company.tiContactPersonId);
    case "gestor":
      return snap.person.managerId ? ctx.repo.people.get(snap.person.managerId) : undefined;
    default:
      return undefined;
  }
}

async function runGlobalEmail(
  ctx: DomainContext,
  rule: AutomationRule,
  action: Extract<RuleAction, { type: "send_email" }>,
  ev: DomainEventInput,
) {
  const payload = ev.payload ?? {};
  let people = await activePeople(ctx);
  if (action.to === "people_eligible") {
    const regimes = (payload.eligibleRegimes as string[] | undefined) ?? ["PJ", "CLT"];
    people = people.filter((p) => !p.regime || regimes.includes(p.regime));
  }
  for (const person of people) {
    let vars: EmailVars = { primeiroNome: preferredFirstName(person) };
    if (action.template === "politica-nova-versao") {
      vars = {
        ...vars,
        politica: String(payload.title ?? ""),
        versao: `versão ${String(payload.version ?? "")}`,
        resumoMudanca: String(payload.changelog ?? ""),
        link: portalLink(ctx, person.id, `/politicas-beneficios/${String(payload.policyId ?? "")}`),
      };
    } else if (action.template === "beneficio-mudou") {
      vars = {
        ...vars,
        categoria: String(payload.categoryLabel ?? "saúde"),
        provedorAnterior: String(payload.previousProvider ?? "o provedor anterior"),
        provedorNovo: String(payload.newProvider ?? ""),
        vigencia: formatDate(String(payload.validFrom ?? spDateKey(ctx.clock.now()))),
        link: portalLink(ctx, person.id, "/politicas-beneficios"),
      };
    }
    await sendTemplateEmail(ctx, { templateId: action.template, to: person, vars, ruleId: rule.id });
  }
}

async function runCaseEmail(
  ctx: DomainContext,
  rule: AutomationRule,
  action: Extract<RuleAction, { type: "send_email" }>,
  ev: DomainEventInput,
  view: CaseView,
  scratch: ExecScratch,
  recipientOverride?: Person,
) {
  const to = recipientOverride ?? (await resolveCaseRecipient(ctx, action.to, view));
  if (!to) return;
  const cc: Person[] = [];
  for (const ref of action.cc ?? []) {
    const p = await resolveCaseRecipient(ctx, ref, view);
    if (p && p.id !== to.id) cc.push(p);
  }
  const vars = await joinerVars(ctx, action.template, view, ev, scratch, to);
  const isJoiner = to.id === view.snapshot.person.id;
  await sendTemplateEmail(ctx, {
    templateId: action.template,
    to,
    address: isJoiner ? joinerEmail(to) : emailOf(to),
    cc,
    vars,
    caseId: view.snapshot.case.id,
    ruleId: rule.id,
  });
}

async function runRule(
  ctx: DomainContext,
  rule: AutomationRule,
  ev: DomainEventInput,
  view: CaseView | undefined,
) {
  const scratch: ExecScratch = {};
  for (const action of rule.actions) {
    switch (action.type) {
      case "send_email":
        if (action.to === "people_active" || action.to === "people_eligible") {
          await runGlobalEmail(ctx, rule, action, ev);
        } else if (view) {
          await runCaseEmail(ctx, rule, action, ev, view, scratch);
        }
        break;
      case "record_evidence": {
        if (!view) break;
        const attempt = view.snapshot.quizAttempts.filter((a) => a.passed).at(-1);
        const code = `CT-${String(ctx.repo.newId("ct").split("-")[1]).padStart(6, "0")}`;
        scratch.evidenceCode = code;
        await recordAudit(ctx, {
          type: "evidence.recorded",
          caseId: view.snapshot.case.id,
          personId: view.snapshot.person.id,
          actorId: AUTOMATION_ACTOR,
          ruleId: rule.id,
          payload: {
            kind: action.evidence,
            code,
            score: attempt?.score,
            quizVersion: attempt?.quizVersion,
            videoVersion: attempt?.videoVersion,
            attemptId: attempt?.id,
            answeredAt: attempt?.answeredAt,
          },
        });
        break;
      }
      case "require_reack": {
        const people = await activePeople(ctx);
        await recordAudit(ctx, {
          type: "policy.reack_required",
          actorId: AUTOMATION_ACTOR,
          ruleId: rule.id,
          payload: { ...(ev.payload ?? {}), people: people.length },
        });
        break;
      }
      case "reindex_assistant": {
        const version = await ctx.repo.meta.bumpContentVersion();
        await recordAudit(ctx, {
          type: "assistant.reindexed",
          actorId: AUTOMATION_ACTOR,
          ruleId: rule.id,
          payload: { contentVersion: version, reason: ev.type },
        });
        break;
      }
      case "create_task":
      case "unlock_task":
        // A liberação em si é do motor de fluxo; aqui só há atribuição (ver recordUnlocks).
        break;
    }
  }
}

async function recordUnlocks(
  ctx: DomainContext,
  caseId: string,
  personId: string,
  transitions: Transitions,
  attribution: Map<string, string>,
) {
  for (const u of transitions.unlocked) {
    await recordAudit(ctx, {
      type: "task.unlocked",
      caseId,
      personId,
      actorId: AUTOMATION_ACTOR,
      ruleId: attribution.get(u.taskDefId),
      payload: { taskDefId: u.taskDefId, title: u.title, owner: u.owner, stageId: u.stageId },
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Eventos derivados
// ---------------------------------------------------------------------------------------------

function lastIndexOfType(events: AuditEvent[], type: string): number {
  for (let i = events.length - 1; i >= 0; i--) if (events[i]!.type === type) return i;
  return -1;
}

async function deriveEvents(ctx: DomainContext, ev: DomainEventInput, transitions: Transitions): Promise<DomainEventInput[]> {
  if (!ev.caseId) return [];
  const snap = await loadCaseSnapshot(ctx, ev.caseId);
  const base = { caseId: ev.caseId, personId: snap.person.id, actorId: ev.actorId };
  const out: DomainEventInput[] = [];

  if (ev.type === "document.submitted" || ev.type === "document.approved" || ev.type === "document.rejected") {
    const ds = documentState(snap);
    const audit = (await ctx.repo.audit.listByCase(ev.caseId)).sort((a, b) => a.at.localeCompare(b.at));
    const lastAll = lastIndexOfType(audit, "documents.all_submitted");
    const lastRejected = lastIndexOfType(audit, "document.rejected");
    if (ds.allSubmitted && (lastAll < 0 || lastRejected > lastAll)) {
      out.push({ ...base, type: "documents.all_submitted", payload: { count: ds.required.length } });
    }
    if (ds.allApproved) out.push({ ...base, type: "documents.all_approved", payload: { count: ds.required.length } });
  }
  if (ev.type === "access.granted") {
    const grants = snap.accessGrants.filter((g) => g.status !== "revogado");
    if (grants.length > 0 && grants.every((g) => g.status === "liberado")) {
      out.push({ ...base, type: "access.all_granted", payload: { count: grants.length } });
    }
  }
  if (ev.type === "policy.acknowledged") {
    const policyTasks = snap.workflow.stages.flatMap((s) => s.tasks).filter((t) => t.kind === "aceite_politica");
    const allAcked = policyTasks.every((t) =>
      snap.policyAcks.some((a) => a.policyId === t.ref && a.version === snap.currentPolicyVersions[t.ref ?? ""]),
    );
    if (allAcked) out.push({ ...base, type: "policies.all_acknowledged" });
  }
  for (const stageId of transitions.stagesCompleted) {
    const stage = snap.workflow.stages.find((s) => s.id === stageId);
    out.push({ ...base, type: "stage.completed", payload: { stageId, title: stage?.title } });
  }
  if (transitions.caseCompleted) out.push({ ...base, type: "case.completed" });
  return out;
}

async function alreadyRecorded(ctx: DomainContext, ev: DomainEventInput): Promise<boolean> {
  if (!ev.caseId) return false;
  if (ev.type === "case.completed") {
    const c = await ctx.repo.cases.get(ev.caseId);
    return c?.status !== "em_andamento";
  }
  if (ev.type === "stage.completed") {
    const audit = await ctx.repo.audit.listByCase(ev.caseId);
    return audit.some((a) => a.type === "stage.completed" && a.payload?.stageId === ev.payload?.stageId);
  }
  if (ONCE_PER_CASE.has(ev.type)) {
    const audit = await ctx.repo.audit.listByCase(ev.caseId);
    return audit.some((a) => a.type === ev.type);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------------------------

async function processEvent(ctx: DomainContext, ev: DomainEventInput, depth: number): Promise<void> {
  if (depth > MAX_DEPTH) throw new Error(`Eventos em cascata demais a partir de ${ev.type}`);
  if (ev.type === "clock.tick") return processTick(ctx, ev, depth);

  if (ev.type === "case.completed" && ev.caseId) {
    const c = await ctx.repo.cases.get(ev.caseId);
    const now = ctx.clock.nowIso();
    const leadTimeDays = c ? (new Date(now).getTime() - new Date(c.createdAt).getTime()) / 86_400_000 : undefined;
    await ctx.repo.cases.update(ev.caseId, { status: "concluido", completedAt: now });
    ev = { ...ev, payload: { ...(ev.payload ?? {}), leadTimeDays } };
  }

  const audit = await recordAudit(ctx, {
    type: ev.type,
    caseId: ev.caseId,
    personId: ev.personId,
    actorId: ev.actorId,
    payload: ev.payload,
  });

  const transitions = ev.caseId ? await reevaluateCase(ctx, ev.caseId, ev.actorId) : NO_TRANSITIONS;
  const view = ev.caseId ? buildCaseView(await loadCaseSnapshot(ctx, ev.caseId)) : undefined;

  // Regras que disparam agora.
  const firing: { rule: AutomationRule; key: string }[] = [];
  for (const rule of await enabledRulesFor(ctx, ev.type)) {
    if (!ev.caseId && rule.actions.some((a) => a.type === "send_email" && !a.to.startsWith("people_"))) continue;
    if (rule.when && !rule.when(ruleContext(ev, view))) continue;
    const key = firingKey(rule, ev, audit.id);
    if (!rule.repeatable && (await hasFiring(ctx, key))) continue;
    firing.push({ rule, key });
  }

  // Liberações atribuídas à regra que as nomeia (D-OB-28).
  if (ev.caseId && view) {
    const attribution = new Map<string, string>();
    for (const u of transitions.unlocked) {
      const f = firing.find(({ rule }) =>
        rule.actions.some((a) => (a.type === "create_task" || a.type === "unlock_task") && a.taskId === u.taskDefId),
      );
      if (f) attribution.set(u.taskDefId, f.rule.id);
    }
    await recordUnlocks(ctx, ev.caseId, view.snapshot.person.id, transitions, attribution);
  }

  for (const { rule, key } of firing) {
    await recordFiring(ctx, rule, key, ev);
    await runRule(ctx, rule, ev, view);
  }

  for (const derived of await deriveEvents(ctx, ev, transitions)) {
    if (await alreadyRecorded(ctx, derived)) continue;
    await processEvent(ctx, derived, depth + 1);
  }
}

/** Virada de dia: reavalia datas em todos os casos e roda as regras agendadas (A14, A15). */
async function processTick(ctx: DomainContext, ev: DomainEventInput, depth: number): Promise<void> {
  const today = ctx.clock.todayKey();
  const cases = (await ctx.repo.cases.list()).filter((c) => c.status === "em_andamento");

  for (const c of cases) {
    const transitions = await reevaluateCase(ctx, c.id, SYSTEM_ACTOR);
    await recordUnlocks(ctx, c.id, c.personId, transitions, new Map());
    for (const derived of await deriveEvents(ctx, { type: "clock.tick", caseId: c.id, actorId: SYSTEM_ACTOR }, transitions)) {
      if (await alreadyRecorded(ctx, derived)) continue;
      await processEvent(ctx, derived, depth + 1);
    }
  }

  for (const rule of await enabledRulesFor(ctx, "clock.tick")) {
    const action = rule.actions.find((a): a is Extract<RuleAction, { type: "send_email" }> => a.type === "send_email");
    if (!action) continue;
    const active = (await ctx.repo.cases.list()).filter((c) => c.status === "em_andamento");

    if (rule.schedule === "vespera_inicio") {
      for (const c of active) {
        if (addDaysKey(today, 1) !== c.startDate) continue;
        const key = `${rule.id}:${c.id}`;
        if (await hasFiring(ctx, key)) continue;
        const view = buildCaseView(await loadCaseSnapshot(ctx, c.id));
        await recordFiring(ctx, rule, key, { type: ev.type, caseId: c.id });
        await runCaseEmail(ctx, rule, action, { ...ev, caseId: c.id }, view, {});
      }
    }

    if (rule.schedule === "tarefa_parada") {
      const firings = await ctx.repo.automations.listFirings();
      for (const c of active) {
        const view = buildCaseView(await loadCaseSnapshot(ctx, c.id));
        for (const task of view.tasks) {
          if (!task.actionable || !task.instance.availableAt) continue;
          const days = daysBetweenKeys(spDateKey(task.instance.availableAt), today);
          if (days < 3) continue;
          const key = `${rule.id}:${task.instance.id}`;
          const last = firings.filter((f) => f.key === key).map((f) => f.firedAt).sort().at(-1);
          if (last && daysBetweenKeys(spDateKey(last), today) < 3) continue;
          const recipient = await ownerPerson(ctx, task.def.owner, c, view.snapshot.person);
          if (!recipient) continue;
          await recordFiring(ctx, rule, key, { type: ev.type, caseId: c.id });
          await runCaseEmail(ctx, rule, action, { ...ev, caseId: c.id }, view, { task, taskDays: days }, recipient);
        }
      }
    }
  }
}

/** Emite um evento de domínio e tudo o que ele desencadeia. */
export async function emit(ctx: DomainContext, ev: DomainEventInput): Promise<void> {
  await processEvent(ctx, ev, 0);
}

/** Vira o dia do relógio virtual, se ainda não virou hoje (seção 8.5). */
export async function tickIfNewDay(ctx: DomainContext, actorId: string = SYSTEM_ACTOR): Promise<boolean> {
  const today = ctx.clock.todayKey();
  const last = await ctx.repo.meta.getLastTickDate();
  if (last === today) return false;
  await ctx.repo.meta.setLastTickDate(today);
  await emit(ctx, { type: "clock.tick", actorId });
  return true;
}

export type { StageId };
