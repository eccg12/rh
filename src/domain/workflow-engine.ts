/**
 * Motor de fluxo (seção 7.2). O status de cada tarefa sai dos fatos do domínio (ficha enviada,
 * documentos aprovados, contrato assinado…) e das condições de liberação da configuração.
 * `reevaluateCase` persiste as mudanças (liberação, conclusão, reversão) e devolve as transições,
 * que o motor de automações registra na linha do tempo.
 */
import { requirementsFor } from "@/config/documents";
import { workflowById } from "@/config/workflows";
import { addDaysKey, spDateKey } from "@/lib/dates";

import type { DomainContext } from "./context";
import { DomainError } from "./context";
import type {
  AccessGrant,
  BenefitAck,
  Contract,
  DocumentRequirement,
  DocumentSubmission,
  Equipment,
  FeedbackResponse,
  FormResponse,
  OnboardingCase,
  Owner,
  Person,
  PolicyAck,
  Quiz,
  QuizAttempt,
  StageDefinition,
  StageId,
  TaskDefinition,
  TaskInstance,
  TaskStatus,
  TrainingVideo,
  UnlockCondition,
  VideoView,
  WorkflowDefinition,
} from "./schemas";

// ---------------------------------------------------------------------------------------------
// Snapshot do caso
// ---------------------------------------------------------------------------------------------

export interface CaseSnapshot {
  case: OnboardingCase;
  person: Person;
  workflow: WorkflowDefinition;
  tasks: TaskInstance[];
  form?: FormResponse;
  /** Todos os envios (inclusive substituídos). */
  documents: DocumentSubmission[];
  contract?: Contract;
  videoViews: VideoView[];
  quizAttempts: QuizAttempt[];
  policyAcks: PolicyAck[];
  /** Versão vigente de cada política. */
  currentPolicyVersions: Record<string, number>;
  benefitAcks: BenefitAck[];
  equipment: Equipment[];
  accessGrants: AccessGrant[];
  survey?: FeedbackResponse;
  /** Tipos de evento já registrados para o caso (condições `event`). */
  eventTypes: Set<string>;
  /** Etapas com `stage.completed` já registrado. */
  recordedStages: Set<string>;
  video: TrainingVideo;
  quiz: Quiz;
}

export async function loadCaseSnapshot(ctx: DomainContext, caseId: string): Promise<CaseSnapshot> {
  const { repo } = ctx;
  const c = await repo.cases.get(caseId);
  if (!c) throw new DomainError("Caso não encontrado.", "NOT_FOUND");
  const person = await repo.people.get(c.personId);
  if (!person) throw new DomainError("Pessoa do caso não encontrada.", "NOT_FOUND");

  const [tasks, form, documents, contract, videoViews, attempts, acks, policyVersions, benefitAcks, equipment, access, surveys, audit, video, quiz] =
    await Promise.all([
      repo.tasks.listByCase(caseId),
      repo.forms.get(caseId),
      repo.documents.listByCase(caseId),
      repo.contracts.getByCase(caseId),
      repo.training.listVideoViews(),
      repo.training.listQuizAttempts(),
      repo.policyAcks.listByPerson(person.id),
      repo.policies.listVersions(),
      repo.benefitAcks.list(),
      repo.equipment.list(),
      repo.access.list(),
      repo.surveys.list(),
      repo.audit.listByCase(caseId),
      repo.training.getVideo(),
      repo.training.getQuiz(),
    ]);

  const currentPolicyVersions: Record<string, number> = {};
  for (const p of policyVersions) {
    currentPolicyVersions[p.id] = Math.max(currentPolicyVersions[p.id] ?? 0, p.version);
  }

  return {
    case: c,
    person,
    workflow: workflowById(c.workflowId),
    tasks,
    form,
    documents,
    contract,
    videoViews: videoViews.filter((v) => v.caseId === caseId),
    quizAttempts: attempts.filter((a) => a.caseId === caseId).sort((a, b) => a.answeredAt.localeCompare(b.answeredAt)),
    policyAcks: acks,
    currentPolicyVersions,
    benefitAcks: benefitAcks.filter((b) => b.caseId === caseId),
    equipment: equipment.filter((e) => e.assignedToId === person.id),
    accessGrants: access.filter((g) => g.caseId === caseId),
    survey: surveys.find((s) => s.caseId === caseId),
    eventTypes: new Set(audit.map((e) => e.type)),
    recordedStages: new Set(
      audit.filter((e) => e.type === "stage.completed").map((e) => String(e.payload?.stageId ?? "")),
    ),
    video,
    quiz,
  };
}

// ---------------------------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------------------------

export interface DocumentItemState {
  requirement: DocumentRequirement;
  level: "obrigatorio" | "condicional" | "opcional";
  /** Envio vigente (o último não substituído). */
  current?: DocumentSubmission;
  history: DocumentSubmission[];
}

export interface DocumentState {
  items: DocumentItemState[];
  required: DocumentItemState[];
  requiredSubmitted: number;
  requiredApproved: number;
  allSubmitted: boolean;
  allApproved: boolean;
  pendingReview: number;
  rejected: number;
  anySubmitted: boolean;
}

export function currentSubmission(docs: DocumentSubmission[], requirementId: string): DocumentSubmission | undefined {
  const list = docs.filter((d) => d.requirementId === requirementId && !d.supersededById);
  return list.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[list.length - 1];
}

export function documentState(snap: Pick<CaseSnapshot, "case" | "documents">): DocumentState {
  const regime = snap.case.regime;
  const items: DocumentItemState[] = requirementsFor(regime).map((requirement) => ({
    requirement,
    level: requirement.requirement[regime] ?? "opcional",
    current: currentSubmission(snap.documents, requirement.id),
    history: snap.documents
      .filter((d) => d.requirementId === requirement.id)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
  }));
  const required = items.filter((i) => i.level === "obrigatorio");
  const requiredSubmitted = required.filter((i) => i.current && i.current.status !== "rejeitado").length;
  const requiredApproved = required.filter((i) => i.current?.status === "aprovado").length;
  return {
    items,
    required,
    requiredSubmitted,
    requiredApproved,
    allSubmitted: required.length > 0 && requiredSubmitted === required.length,
    allApproved: required.length > 0 && requiredApproved === required.length,
    pendingReview: items.filter((i) => i.current?.status === "enviado").length,
    rejected: items.filter((i) => i.current?.status === "rejeitado").length,
    anySubmitted: items.some((i) => !!i.current),
  };
}

// ---------------------------------------------------------------------------------------------
// Avaliação de tarefas
// ---------------------------------------------------------------------------------------------

/** Tarefas que podem voltar atrás depois de concluídas (rejeição de documento, contrato recusado). */
const REVERTIBLE = new Set<TaskDefinition["kind"]>(["documentos", "revisao_documentos", "contrato_preparar"]);

type Progress = "em_andamento" | "aguardando_revisao" | null;

interface KindEvaluation {
  done: boolean;
  progress: Progress;
}

function notebook(snap: CaseSnapshot): Equipment | undefined {
  return snap.equipment.find((e) => e.type === "notebook");
}

export function evaluateKind(def: TaskDefinition, inst: TaskInstance | undefined, snap: CaseSnapshot): KindEvaluation {
  const manual = !!inst?.completedAt;
  switch (def.kind) {
    case "cadastro":
      return { done: true, progress: null };
    case "ficha":
      return { done: snap.form?.status === "enviado", progress: snap.form ? "em_andamento" : null };
    case "documentos": {
      const ds = documentState(snap);
      if (ds.allApproved) return { done: true, progress: null };
      if (ds.allSubmitted && ds.rejected === 0) return { done: false, progress: "aguardando_revisao" };
      return { done: false, progress: ds.anySubmitted ? "em_andamento" : null };
    }
    case "revisao_documentos": {
      const ds = documentState(snap);
      if (ds.allApproved) return { done: true, progress: null };
      const reviewed = ds.items.some((i) => i.current && i.current.status !== "enviado");
      return { done: false, progress: ds.pendingReview === 0 || reviewed ? "em_andamento" : null };
    }
    case "contrato_preparar": {
      const st = snap.contract?.status;
      if (st === "enviado" || st === "assinado") return { done: true, progress: null };
      return { done: false, progress: snap.contract?.fileName && st === "rascunho" ? "em_andamento" : null };
    }
    case "contrato_assinar":
      return { done: snap.contract?.status === "assinado", progress: null };
    case "video":
      return { done: snap.videoViews.length > 0, progress: null };
    case "quiz":
      return {
        done: snap.quizAttempts.some((a) => a.passed),
        progress: snap.quizAttempts.length > 0 ? "em_andamento" : null,
      };
    case "aceite_politica": {
      const policyId = def.ref ?? "";
      const current = snap.currentPolicyVersions[policyId];
      return {
        done: snap.policyAcks.some((a) => a.policyId === policyId && a.version === current),
        progress: null,
      };
    }
    case "beneficios":
      return { done: snap.benefitAcks.length > 0, progress: null };
    case "email_corporativo":
      return { done: !!snap.person.corporateEmail || manual, progress: null };
    case "equipamento_atribuir":
      return { done: !!notebook(snap), progress: null };
    case "termo_equipamento":
      return { done: !!notebook(snap)?.termAcceptedAt, progress: null };
    case "acessos": {
      const grants = snap.accessGrants.filter((g) => g.status !== "revogado");
      const granted = grants.filter((g) => g.status === "liberado").length;
      return {
        done: grants.length > 0 && granted === grants.length,
        progress: granted > 0 ? "em_andamento" : null,
      };
    }
    case "exame_agendar":
      return { done: !!inst?.data?.examDate || manual, progress: null };
    case "exame_aso":
      return {
        done: snap.documents.some((d) => d.requirementId === "aso" && !d.supersededById && d.status !== "rejeitado"),
        progress: null,
      };
    case "envio_contabilidade":
    case "primeiro_dia_agenda":
    case "primeiro_dia_checkin":
      return { done: manual, progress: null };
    case "feedback":
      return { done: !!snap.survey, progress: null };
  }
}

function applies(def: TaskDefinition, c: OnboardingCase): boolean {
  if (def.appliesWhen === "needsNotebook") return c.needsNotebook;
  return true;
}

function stageDoneFrom(stage: StageDefinition, statuses: Map<string, TaskStatus>): boolean {
  return stage.tasks
    .filter((t) => t.required)
    .every((t) => {
      const s = statuses.get(t.id);
      return s === "concluida" || s === "dispensada";
    });
}

export function conditionMet(
  cond: UnlockCondition,
  snap: CaseSnapshot,
  statuses: Map<string, TaskStatus>,
  todayKey: string,
): boolean {
  switch (cond.type) {
    case "task_done": {
      const s = statuses.get(cond.taskId);
      return s === "concluida" || s === "dispensada";
    }
    case "event":
      return snap.eventTypes.has(cond.event);
    case "date_reached":
      return todayKey >= addDaysKey(snap.case.startDate, cond.offsetDays ?? 0);
    case "stage_done": {
      const stage = snap.workflow.stages.find((s) => s.id === cond.stageId);
      return stage ? stageDoneFrom(stage, statuses) : false;
    }
  }
}

/** Status derivado de todas as tarefas do caso (função pura, ponto fixo em até 6 passadas). */
export function deriveTaskStatuses(snap: CaseSnapshot, now: Date): Map<string, TaskStatus> {
  const todayKey = spDateKey(now);
  const instances = new Map(snap.tasks.map((t) => [t.taskDefId, t]));
  const defs = snap.workflow.stages.flatMap((s) => s.tasks);
  const statuses = new Map<string, TaskStatus>(defs.map((d) => [d.id, instances.get(d.id)?.status ?? "bloqueada"]));

  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const def of defs) {
      const inst = instances.get(def.id);
      let next: TaskStatus;
      if (!applies(def, snap.case)) {
        next = "dispensada";
      } else {
        const ev = evaluateKind(def, inst, snap);
        const sticky = inst?.status === "concluida" && !REVERTIBLE.has(def.kind);
        if (sticky || ev.done) {
          next = "concluida";
        } else {
          const unlocked = (def.unlockWhen ?? []).every((c) => conditionMet(c, snap, statuses, todayKey));
          next = unlocked ? (ev.progress ?? "disponivel") : "bloqueada";
        }
      }
      if (statuses.get(def.id) !== next) {
        statuses.set(def.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return statuses;
}

// ---------------------------------------------------------------------------------------------
// Reavaliação persistida
// ---------------------------------------------------------------------------------------------

export interface TaskTransition {
  taskDefId: string;
  instanceId: string;
  title: string;
  owner: Owner;
  stageId: StageId;
}

export interface Transitions {
  unlocked: TaskTransition[];
  completed: TaskTransition[];
  reverted: TaskTransition[];
  /** Etapas concluídas ainda sem `stage.completed` registrado. */
  stagesCompleted: StageId[];
  /** Todas as etapas concluídas e caso ainda em andamento. */
  caseCompleted: boolean;
}

export const NO_TRANSITIONS: Transitions = {
  unlocked: [],
  completed: [],
  reverted: [],
  stagesCompleted: [],
  caseCompleted: false,
};

export async function reevaluateCase(ctx: DomainContext, caseId: string, actorId: string): Promise<Transitions> {
  const snap = await loadCaseSnapshot(ctx, caseId);
  if (snap.case.status === "cancelado") return NO_TRANSITIONS;
  const now = ctx.clock.now();
  const nowIso = now.toISOString();
  const statuses = deriveTaskStatuses(snap, now);
  const out: Transitions = { unlocked: [], completed: [], reverted: [], stagesCompleted: [], caseCompleted: false };

  for (const stage of snap.workflow.stages) {
    for (const def of stage.tasks) {
      const inst = snap.tasks.find((t) => t.taskDefId === def.id);
      if (!inst) continue;
      const next = statuses.get(def.id) ?? inst.status;
      if (next === inst.status) continue;

      const patch: Partial<TaskInstance> = { status: next };
      const info: TaskTransition = { taskDefId: def.id, instanceId: inst.id, title: def.title, owner: def.owner, stageId: stage.id };
      const wasBlocked = inst.status === "bloqueada" || inst.status === "dispensada";
      if (next === "bloqueada") {
        patch.availableAt = undefined;
      } else if (wasBlocked && next !== "dispensada") {
        patch.availableAt = inst.availableAt ?? nowIso;
        // Liberada e concluída no mesmo passo (ex.: cadastro) não vira "tarefa liberada".
        if (next !== "concluida") out.unlocked.push(info);
      }
      if (next === "concluida") {
        patch.completedAt = inst.completedAt ?? nowIso;
        patch.completedById = inst.completedById ?? actorId;
        if (!patch.availableAt && !inst.availableAt) patch.availableAt = patch.completedAt;
        out.completed.push(info);
      } else if (inst.status === "concluida") {
        patch.completedAt = undefined;
        patch.completedById = undefined;
        out.reverted.push(info);
      }
      await ctx.repo.tasks.update(inst.id, patch);
    }
  }

  let allDone = true;
  for (const stage of snap.workflow.stages) {
    const done = stageDoneFrom(stage, statuses);
    if (!done) allDone = false;
    if (done && !snap.recordedStages.has(stage.id)) out.stagesCompleted.push(stage.id);
  }
  out.caseCompleted = allDone && snap.case.status === "em_andamento";
  return out;
}

// ---------------------------------------------------------------------------------------------
// Visão derivada do caso (usada por consultas, regras e telas)
// ---------------------------------------------------------------------------------------------

export type StageStatus = "concluida" | "em_andamento" | "bloqueada";

export interface TaskView {
  def: TaskDefinition;
  stageId: StageId;
  instance: TaskInstance;
  status: TaskStatus;
  /** Tem ação possível agora, para o dono da tarefa. */
  actionable: boolean;
  /** Minutos estimados para quem entra (vídeo usa a duração real). */
  minutes: number;
}

export interface StageView {
  def: StageDefinition;
  status: StageStatus;
  tasks: TaskView[];
  startedAt?: string;
  completedAt?: string;
  /** Há tarefa disponível para o new joiner nesta etapa. */
  hasJoinerAction: boolean;
  /** Há algo andando do lado da Monoda (RH/TI/gestor ou revisão pendente). */
  waitingOnMonoda: boolean;
}

export interface CaseView {
  snapshot: CaseSnapshot;
  tasks: TaskView[];
  stages: StageView[];
  /** Primeira etapa não concluída, na ordem do fluxo (visão RH). */
  currentStage?: StageView;
  /** Etapa atual do new joiner (seção 7.2). */
  joinerStage?: StageView;
  joinerStageWaiting: boolean;
  /** Próxima ação do new joiner, se houver. */
  nextJoinerTask?: TaskView;
  progress: { done: number; total: number; percent: number };
  remainingJoinerMinutes: number;
  /** Com quem está a próxima ação: "rh" (inclui TI), "new_joiner" ou nada. */
  nextActionWith?: "rh" | "new_joiner";
}

const MONODA_OWNERS: Owner[] = ["rh", "ti", "gestor"];

export function isTaskActionable(view: Pick<TaskView, "def" | "status">, snap: CaseSnapshot): boolean {
  if (view.status !== "disponivel" && view.status !== "em_andamento") return false;
  if (view.def.kind === "revisao_documentos") return documentState(snap).pendingReview > 0;
  if (view.def.kind === "documentos" && view.status === "em_andamento") {
    // Com tudo enviado e nada rejeitado, espera o RH.
    const ds = documentState(snap);
    return !(ds.allSubmitted && ds.rejected === 0);
  }
  if (view.def.kind === "contrato_assinar") return snap.contract?.status === "enviado";
  if (view.def.kind === "quiz") {
    const used = snap.quizAttempts.length;
    return used < snap.quiz.maxAttempts + snap.case.extraQuizAttempts;
  }
  return true;
}

export function buildCaseView(snap: CaseSnapshot): CaseView {
  const videoMinutes = Math.max(1, Math.ceil(snap.video.durationSec / 60));
  const tasks: TaskView[] = snap.workflow.stages.flatMap((stage) =>
    stage.tasks.flatMap((def) => {
      const instance = snap.tasks.find((t) => t.taskDefId === def.id);
      if (!instance) return [];
      const view: TaskView = {
        def,
        stageId: stage.id,
        instance,
        status: instance.status,
        actionable: false,
        minutes: def.kind === "video" ? videoMinutes : (def.estimatedMinutes ?? 0),
      };
      view.actionable = isTaskActionable(view, snap);
      return [view];
    }),
  );

  const stages: StageView[] = snap.workflow.stages.map((def) => {
    const st = tasks.filter((t) => t.stageId === def.id);
    const relevant = st.filter((t) => t.status !== "dispensada");
    const required = relevant.filter((t) => t.def.required);
    const done = required.every((t) => t.status === "concluida");
    const started = relevant.map((t) => t.instance.availableAt).filter((x): x is string => !!x).sort();
    const completed = required.map((t) => t.instance.completedAt).filter((x): x is string => !!x).sort();
    const anyOpen = relevant.some((t) => t.status !== "bloqueada");
    return {
      def,
      status: done ? "concluida" : anyOpen ? "em_andamento" : "bloqueada",
      tasks: st,
      startedAt: started[0],
      completedAt: done ? completed[completed.length - 1] : undefined,
      hasJoinerAction: st.some((t) => t.def.owner === "new_joiner" && t.actionable),
      waitingOnMonoda: st.some(
        (t) =>
          (MONODA_OWNERS.includes(t.def.owner) && (t.status === "disponivel" || t.status === "em_andamento")) ||
          t.status === "aguardando_revisao",
      ),
    };
  });

  const open = stages.filter((s) => s.status !== "concluida");
  const joinerStage = open.find((s) => s.hasJoinerAction) ?? open[0];
  const nextJoinerTask =
    joinerStage?.tasks.find((t) => t.def.owner === "new_joiner" && t.actionable) ??
    tasks.find((t) => t.def.owner === "new_joiner" && t.actionable);

  const applicableRequired = tasks.filter((t) => t.def.required && t.status !== "dispensada");
  const doneCount = applicableRequired.filter((t) => t.status === "concluida").length;
  const remainingJoinerMinutes = tasks
    .filter((t) => t.def.owner === "new_joiner" && t.status !== "concluida" && t.status !== "dispensada")
    .reduce((sum, t) => sum + t.minutes, 0);

  const monodaAction = tasks.some((t) => MONODA_OWNERS.includes(t.def.owner) && t.actionable);
  const joinerAction = tasks.some((t) => t.def.owner === "new_joiner" && t.actionable);

  return {
    snapshot: snap,
    tasks,
    stages,
    currentStage: open[0],
    joinerStage,
    joinerStageWaiting: !!joinerStage && !joinerStage.hasJoinerAction,
    nextJoinerTask,
    progress: {
      done: doneCount,
      total: applicableRequired.length,
      percent: applicableRequired.length ? Math.round((doneCount / applicableRequired.length) * 100) : 0,
    },
    remainingJoinerMinutes,
    nextActionWith: monodaAction ? "rh" : joinerAction ? "new_joiner" : undefined,
  };
}

export async function loadCaseView(ctx: DomainContext, caseId: string): Promise<CaseView> {
  return buildCaseView(await loadCaseSnapshot(ctx, caseId));
}
