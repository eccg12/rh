/**
 * Leituras do onboarding para as telas (seção 9.2): faixa de fluxo com tempo por etapa e gargalo,
 * "Depende de você", automações recentes e a tabela de new joiners.
 */
import { STAGE_ORDER, STAGE_TITLES } from "@/config/workflows";
import { pjWorkflow } from "@/config/workflows/pj";

import type { DomainContext } from "../context";
import type { Owner, Person, StageId } from "../schemas";
import { AUTOMATION_ACTOR } from "../schemas";
import { describeAudit, type TimelineEntry } from "../timeline";
import { buildCaseView, documentState, loadCaseSnapshot, type CaseView } from "../workflow-engine";

const DAY = 86_400_000;

export interface FlowStageStat {
  id: StageId;
  title: string;
  people: number;
  avgDays: number | null;
  samples: number;
  waitsForStartDate: boolean;
  isBottleneck: boolean;
}

export interface PendingItem {
  caseId: string;
  personId: string;
  personName: string;
  taskDefId: string;
  taskTitle: string;
  actionLabel: string;
  availableAt: string;
  owner: Owner;
  stageId: StageId;
  detail?: string;
}

export interface CaseRow {
  caseId: string;
  personId: string;
  name: string;
  regime: "PJ" | "CLT";
  jobTitle?: string;
  startDate: string;
  status: "em_andamento" | "concluido" | "cancelado";
  currentStageId?: StageId;
  currentStageTitle: string;
  progress: number;
  nextActionWith?: "rh" | "new_joiner";
  lastActivityAt: string;
  hasRhPending: boolean;
  completedAt?: string;
  createdAt: string;
}

export async function loadAllCaseViews(ctx: DomainContext): Promise<CaseView[]> {
  const cases = (await ctx.repo.cases.list()).filter((c) => c.status !== "cancelado");
  return Promise.all(cases.map(async (c) => buildCaseView(await loadCaseSnapshot(ctx, c.id))));
}

export function flowStats(views: CaseView[], nowMs: number): { stages: FlowStageStat[]; leadTimeDays: number | null; completed: number } {
  const stats: FlowStageStat[] = STAGE_ORDER.map((id) => {
    const def = pjWorkflow.stages.find((s) => s.id === id);
    const durations: number[] = [];
    for (const v of views) {
      const st = v.stages.find((s) => s.def.id === id);
      if (!st?.startedAt) continue;
      const end = st.completedAt ? Date.parse(st.completedAt) : nowMs;
      durations.push(Math.max(0, end - Date.parse(st.startedAt)) / DAY);
    }
    const waits = !!def?.waitsForStartDate;
    return {
      id,
      title: STAGE_TITLES[id],
      people: views.filter((v) => v.snapshot.case.status === "em_andamento" && v.currentStage?.def.id === id).length,
      avgDays: waits || durations.length === 0 ? null : durations.reduce((a, b) => a + b, 0) / durations.length,
      samples: durations.length,
      waitsForStartDate: waits,
      isBottleneck: false,
    };
  });
  const candidates = stats.filter((s) => s.avgDays !== null && s.avgDays > 0);
  const bottleneck = candidates.sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0];
  if (bottleneck) bottleneck.isBottleneck = true;

  const done = views.filter((v) => v.snapshot.case.status === "concluido" && v.snapshot.case.completedAt);
  const leadTimes = done.map((v) => (Date.parse(v.snapshot.case.completedAt!) - Date.parse(v.snapshot.case.createdAt)) / DAY);
  return {
    stages: stats,
    leadTimeDays: leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null,
    completed: done.length,
  };
}

function pendingDetail(view: CaseView, taskDefId: string): string | undefined {
  const snap = view.snapshot;
  switch (taskDefId) {
    case "revisao-documentos": {
      const n = documentState(snap).pendingReview;
      return `${n} ${n === 1 ? "documento" : "documentos"} para revisar`;
    }
    case "acessos": {
      const grants = snap.accessGrants.filter((g) => g.status !== "revogado");
      return `${grants.filter((g) => g.status === "liberado").length} de ${grants.length} liberados`;
    }
    case "contrato-preparar":
      return snap.contract?.status === "recusado"
        ? `Recusado: ${snap.contract.declineReason ?? "sem motivo"}`
        : snap.case.contractMode === "customizado"
          ? "Contrato customizado"
          : "Modelo padrão";
    default:
      return undefined;
  }
}

export function rhPending(views: CaseView[]): PendingItem[] {
  const items: PendingItem[] = [];
  for (const v of views) {
    if (v.snapshot.case.status !== "em_andamento") continue;
    for (const t of v.tasks) {
      if (t.def.owner === "new_joiner" || !t.actionable || !t.instance.availableAt) continue;
      items.push({
        caseId: v.snapshot.case.id,
        personId: v.snapshot.person.id,
        personName: v.snapshot.person.name,
        taskDefId: t.def.id,
        taskTitle: t.def.title,
        actionLabel: t.def.actionLabel ?? "Abrir",
        availableAt: t.instance.availableAt,
        owner: t.def.owner,
        stageId: t.stageId,
        detail: pendingDetail(v, t.def.id),
      });
    }
  }
  return items.sort((a, b) => a.availableAt.localeCompare(b.availableAt));
}

export async function onboardingOverview(ctx: DomainContext) {
  const now = ctx.clock.now();
  const views = await loadAllCaseViews(ctx);
  const [people, audit] = await Promise.all([ctx.repo.people.list(), ctx.repo.audit.list()]);
  const byId = new Map<string, Person>(people.map((p) => [p.id, p]));
  const since = now.getTime() - 30 * DAY;
  const automated = audit
    .filter((e) => e.actorId === AUTOMATION_ACTOR && Date.parse(e.at) >= since && Date.parse(e.at) <= now.getTime())
    .sort((a, b) => b.at.localeCompare(a.at));

  const lastActivity = new Map<string, string>();
  for (const e of audit) {
    if (!e.caseId || e.actorId === AUTOMATION_ACTOR) continue;
    const prev = lastActivity.get(e.caseId);
    if (!prev || e.at > prev) lastActivity.set(e.caseId, e.at);
  }
  const pending = rhPending(views);

  const cases: CaseRow[] = views
    .map((v) => {
      const c = v.snapshot.case;
      return {
        caseId: c.id,
        personId: v.snapshot.person.id,
        name: v.snapshot.person.name,
        regime: c.regime,
        jobTitle: v.snapshot.person.jobTitle,
        startDate: c.startDate,
        status: c.status,
        currentStageId: v.currentStage?.def.id,
        currentStageTitle: v.currentStage?.def.title ?? "Concluído",
        progress: v.progress.percent,
        nextActionWith: c.status === "em_andamento" ? v.nextActionWith : undefined,
        lastActivityAt: lastActivity.get(c.id) ?? c.createdAt,
        hasRhPending: pending.some((p) => p.caseId === c.id),
        completedAt: c.completedAt,
        createdAt: c.createdAt,
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "em_andamento" ? -1 : 1;
      return a.startDate.localeCompare(b.startDate);
    });

  const flow = flowStats(views, now.getTime());
  return {
    now: now.toISOString(),
    leadTimeDays: flow.leadTimeDays,
    completedCount: flow.completed,
    stages: flow.stages,
    pending,
    automations: {
      total30d: automated.length,
      recent: automated.slice(0, 5).map((e): TimelineEntry => describeAudit(e, byId)),
    },
    cases,
  };
}
