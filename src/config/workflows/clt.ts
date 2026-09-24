/**
 * Fluxo CLT (seção 7.3): preparado e em validação com a contabilidade. Mesmas etapas do PJ, com
 * ficha e documentos da CLT e três tarefas a mais (exame admissional, ASO e envio à contabilidade).
 */
import type { WorkflowDefinition } from "@/domain/schemas";

import { buildStages } from "./pj";

export const cltWorkflow: WorkflowDefinition = {
  id: "clt",
  regime: "CLT",
  version: 1,
  title: "Onboarding CLT",
  badge: "Fluxo em validação com a contabilidade",
  stages: buildStages({ cltStage2: true, cltStage3: true }),
};
