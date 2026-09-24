/**
 * Fluxos em linguagem simples para o Admin (seção 9.10): etapas, tarefas, donos e condições de
 * liberação. Somente leitura; a edição de fluxo fica para a Fase 2.
 */
import { allTasks, STAGE_TITLES } from "@/config/workflows";

import { eventLabel } from "./events";
import type { Owner, UnlockCondition, WorkflowDefinition } from "./schemas";

export const FLOW_OWNER_LABELS: Record<Owner, string> = {
  new_joiner: "Quem entra",
  rh: "RH",
  ti: "TI",
  gestor: "Gestor do projeto",
};

export interface FlowTaskRow {
  id: string;
  title: string;
  owner: Owner;
  ownerLabel: string;
  required: boolean;
  minutes?: number;
  unlock: string;
  appliesWhen?: string;
}

export interface FlowStageRow {
  id: string;
  order: number;
  title: string;
  summary: string;
  waitsForStartDate: boolean;
  tasks: FlowTaskRow[];
}

export interface FlowDescription {
  id: string;
  title: string;
  badge?: string;
  stages: FlowStageRow[];
  totals: { tasks: number; required: number; joinerMinutes: number };
}

function conditionText(c: UnlockCondition, titles: Map<string, string>): string {
  switch (c.type) {
    case "task_done":
      return `"${titles.get(c.taskId) ?? c.taskId}" concluída`;
    case "event":
      return eventLabel(c.event).toLowerCase();
    case "date_reached": {
      const n = c.offsetDays ?? 0;
      if (n === 0) return "a partir da data de início";
      return n < 0 ? `${-n} ${n === -1 ? "dia" : "dias"} antes do início` : `${n} ${n === 1 ? "dia" : "dias"} depois do início`;
    }
    case "stage_done":
      return `etapa "${STAGE_TITLES[c.stageId]}" concluída`;
  }
}

export function describeWorkflow(wf: WorkflowDefinition): FlowDescription {
  const titles = new Map(allTasks(wf).map((t) => [t.id, t.title]));
  const stages = wf.stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map<FlowStageRow>((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      summary: s.summary,
      waitsForStartDate: !!s.waitsForStartDate,
      tasks: s.tasks.map((t) => {
        const conditions = t.unlockWhen ?? [];
        return {
          id: t.id,
          title: t.title,
          owner: t.owner,
          ownerLabel: FLOW_OWNER_LABELS[t.owner],
          required: t.required,
          minutes: t.estimatedMinutes,
          unlock: conditions.length === 0 ? "Liberada no cadastro" : `Libera com: ${conditions.map((c) => conditionText(c, titles)).join(" e ")}`,
          appliesWhen: t.appliesWhen === "needsNotebook" ? "Só quando a pessoa precisa de notebook" : undefined,
        };
      }),
    }));
  const tasks = stages.flatMap((s) => s.tasks);
  return {
    id: wf.id,
    title: wf.title,
    badge: wf.badge,
    stages,
    totals: {
      tasks: tasks.length,
      required: tasks.filter((t) => t.required).length,
      joinerMinutes: tasks.filter((t) => t.owner === "new_joiner").reduce((sum, t) => sum + (t.minutes ?? 0), 0),
    },
  };
}
