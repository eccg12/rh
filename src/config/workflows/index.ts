import type { Regime, StageDefinition, StageId, TaskDefinition, WorkflowDefinition } from "@/domain/schemas";

import { cltWorkflow } from "./clt";
import { pjWorkflow } from "./pj";

export const workflows: WorkflowDefinition[] = [pjWorkflow, cltWorkflow];

export function workflowForRegime(regime: Regime): WorkflowDefinition {
  return regime === "CLT" ? cltWorkflow : pjWorkflow;
}

export function workflowById(id: string): WorkflowDefinition {
  const wf = workflows.find((w) => w.id === id);
  if (!wf) throw new Error(`Fluxo desconhecido: ${id}`);
  return wf;
}

export function allTasks(wf: WorkflowDefinition): (TaskDefinition & { stageId: StageId })[] {
  return wf.stages.flatMap((s) => s.tasks.map((t) => ({ ...t, stageId: s.id })));
}

export function stageById(wf: WorkflowDefinition, id: StageId): StageDefinition | undefined {
  return wf.stages.find((s) => s.id === id);
}

/** Títulos das etapas na ordem de exibição (iguais nos dois regimes). */
export const STAGE_TITLES: Record<StageId, string> = Object.fromEntries(
  pjWorkflow.stages.map((s) => [s.id, s.title]),
) as Record<StageId, string>;

export const STAGE_ORDER: StageId[] = pjWorkflow.stages.map((s) => s.id);
