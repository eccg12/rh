/**
 * Políticas e benefícios (seção 9.5): o status de aceite de cada pessoa, a matriz de aceites do RH,
 * o detalhe com histórico de versões e os benefícios por categoria.
 *
 * Para quem está no onboarding, o aceite das políticas do fluxo acontece na jornada: antes da etapa
 * liberar, a política aparece como "na jornada" e o botão não aparece (evita pular etapa).
 */
import { POLICY_CATEGORY_LABELS } from "@/config/knowledge";
import { STAGE_TITLES } from "@/config/workflows";

import type { DomainContext } from "../context";
import { DomainError } from "../context";
import type { BenefitCategory, BenefitPlan, Person, Policy, PolicyAck, PolicyCategory, Regime, StageId } from "../schemas";
import { loadCaseView, type CaseView } from "../workflow-engine";
import { BENEFIT_CATEGORY_LABELS, currentPolicies } from "./content";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const PRIVACY_POLICY_ID = "aviso-de-privacidade";

export type AckState = "aceita" | "pendente" | "reaceite" | "na_jornada" | "nao_exige";

export interface MyAck {
  state: AckState;
  /** Aceite da versão vigente, ou o último aceite (em re-aceite). */
  acknowledgedAt?: string;
  ackedVersion?: number;
  /** Onde o aceite acontece, para quem está no onboarding. */
  journey?: { stageId?: StageId; stageTitle: string; hint: string };
  canAcknowledge: boolean;
}

export interface PolicyListItem {
  id: string;
  title: string;
  category: PolicyCategory;
  categoryLabel: string;
  version: number;
  effectiveFrom: string;
  summary: string;
  changelog?: string;
  requiresAck: boolean;
  isExample: boolean;
  my: MyAck;
}

function latestAck(acks: PolicyAck[], policyId: string): PolicyAck | undefined {
  return acks.filter((a) => a.policyId === policyId).sort((a, b) => b.version - a.version || b.acknowledgedAt.localeCompare(a.acknowledgedAt))[0];
}

/** Status do aceite de uma pessoa em cada política vigente. */
export function ackStatusFor(policy: Policy, acks: PolicyAck[], view: CaseView | undefined): MyAck {
  if (!policy.requiresAck) return { state: "nao_exige", canAcknowledge: false };
  const last = latestAck(acks, policy.id);
  if (last && last.version === policy.version) {
    return { state: "aceita", acknowledgedAt: last.acknowledgedAt, ackedVersion: last.version, canAcknowledge: false };
  }
  if (view) {
    if (policy.id === PRIVACY_POLICY_ID && !last) {
      return {
        state: "na_jornada",
        journey: { stageId: "cadastro-documentos", stageTitle: STAGE_TITLES["cadastro-documentos"], hint: "O aceite acontece no envio da ficha cadastral." },
        canAcknowledge: false,
      };
    }
    const task = view.tasks.find((t) => t.def.kind === "aceite_politica" && t.def.ref === policy.id);
    if (task && task.status === "bloqueada") {
      return {
        state: "na_jornada",
        journey: { stageId: task.stageId, stageTitle: STAGE_TITLES[task.stageId], hint: `O aceite fica disponível na etapa "${STAGE_TITLES[task.stageId]}" da sua jornada.` },
        canAcknowledge: false,
      };
    }
  }
  if (last) return { state: "reaceite", acknowledgedAt: last.acknowledgedAt, ackedVersion: last.version, canAcknowledge: true };
  return { state: "pendente", canAcknowledge: true };
}

async function activeCaseView(ctx: DomainContext, personId: string): Promise<CaseView | undefined> {
  const c = await ctx.repo.cases.getByPerson(personId);
  return c?.status === "em_andamento" ? loadCaseView(ctx, c.id) : undefined;
}

function toListItem(p: Policy, my: MyAck): PolicyListItem {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    categoryLabel: POLICY_CATEGORY_LABELS[p.category],
    version: p.version,
    effectiveFrom: p.effectiveFrom,
    summary: p.summary,
    changelog: p.changelog,
    requiresAck: p.requiresAck,
    isExample: p.isExample,
    my,
  };
}

const ORDER: PolicyCategory[] = ["conduta", "viagens", "ti", "rotina", "privacidade", "outros"];

export async function myPolicies(ctx: DomainContext, personId: string): Promise<PolicyListItem[]> {
  const [policies, acks, view] = await Promise.all([
    currentPolicies(ctx),
    ctx.repo.policyAcks.listByPerson(personId),
    activeCaseView(ctx, personId),
  ]);
  return policies
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.title.localeCompare(b.title, "pt-BR"))
    .map((p) => toListItem(p, ackStatusFor(p, acks, view)));
}

export interface PolicyVersionItem {
  version: number;
  effectiveFrom: string;
  publishedAt?: string;
  changelog?: string;
  isCurrent: boolean;
}

export interface PolicyDetail extends PolicyListItem {
  bodyMd: string;
  /** Versão exibida (pode ser anterior à vigente). */
  shownVersion: number;
  isCurrent: boolean;
  versions: PolicyVersionItem[];
}

export async function policyDetail(
  ctx: DomainContext,
  personId: string,
  policyId: string,
  version?: number,
): Promise<PolicyDetail> {
  const all = (await ctx.repo.policies.listVersions()).filter((p) => p.id === policyId).sort((a, b) => b.version - a.version);
  const current = all[0];
  if (!current) throw new DomainError("Política não encontrada.", "NOT_FOUND");
  const shown = version ? all.find((p) => p.version === version) : current;
  if (!shown) throw new DomainError(`A versão ${version} desta política não existe.`, "NOT_FOUND");
  const [acks, view] = await Promise.all([ctx.repo.policyAcks.listByPerson(personId), activeCaseView(ctx, personId)]);
  const my = ackStatusFor(current, acks, view);
  return {
    ...toListItem(current, my),
    title: shown.title,
    summary: shown.summary,
    effectiveFrom: shown.effectiveFrom,
    changelog: shown.changelog,
    isExample: shown.isExample,
    bodyMd: shown.bodyMd,
    shownVersion: shown.version,
    isCurrent: shown.version === current.version,
    versions: all.map((p) => ({
      version: p.version,
      effectiveFrom: p.effectiveFrom,
      publishedAt: p.publishedAt,
      changelog: p.changelog,
      isCurrent: p.version === current.version,
    })),
  };
}

// ---------------------------------------------------------------------------------------------
// Matriz de aceites (RH)
// ---------------------------------------------------------------------------------------------

export interface AckMatrixRow {
  person: { id: string; name: string; group: "equipe" | "new_joiner"; detail?: string };
  cells: Record<string, MyAck>;
  pending: number;
}

export interface AckMatrix {
  policies: { id: string; title: string; version: number; pending: number }[];
  rows: AckMatrixRow[];
  pendingTotal: number;
}

function isPendingState(state: AckState): boolean {
  return state === "pendente" || state === "reaceite";
}

export async function ackMatrix(ctx: DomainContext): Promise<AckMatrix> {
  const [policies, people, acks, cases] = await Promise.all([
    currentPolicies(ctx),
    ctx.repo.people.list(),
    ctx.repo.policyAcks.list(),
    ctx.repo.cases.list(),
  ]);
  const withAck = policies
    .filter((p) => p.requiresAck)
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const caseByPerson = new Map(cases.map((c) => [c.personId, c]));
  const active = people.filter((p) => caseByPerson.get(p.id)?.status !== "cancelado");

  const rows: AckMatrixRow[] = [];
  for (const person of active) {
    const c = caseByPerson.get(person.id);
    const view = c?.status === "em_andamento" ? await loadCaseView(ctx, c.id) : undefined;
    const mine = acks.filter((a) => a.personId === person.id);
    const cells: Record<string, MyAck> = {};
    for (const p of withAck) cells[p.id] = ackStatusFor(p, mine, view);
    rows.push({
      person: {
        id: person.id,
        name: person.name,
        group: c ? "new_joiner" : "equipe",
        detail: c ? (c.status === "em_andamento" ? "Em onboarding" : "Onboarding concluído") : undefined,
      },
      cells,
      pending: Object.values(cells).filter((cell) => isPendingState(cell.state)).length,
    });
  }
  rows.sort(
    (a, b) =>
      Number(b.pending > 0) - Number(a.pending > 0) ||
      a.person.group.localeCompare(b.person.group) ||
      a.person.name.localeCompare(b.person.name, "pt-BR"),
  );
  const columns = withAck.map((p) => ({
    id: p.id,
    title: p.title,
    version: p.version,
    pending: rows.filter((r) => isPendingState(r.cells[p.id]?.state ?? "aceita")).length,
  }));
  return { policies: columns, rows, pendingTotal: rows.reduce((sum, r) => sum + r.pending, 0) };
}

// ---------------------------------------------------------------------------------------------
// Benefícios
// ---------------------------------------------------------------------------------------------

export interface BenefitCard {
  category: BenefitCategory;
  label: string;
  active: BenefitPlan;
  /** Para quem tem regime definido (new joiner). */
  eligibleForMe?: boolean;
  previous: { providerName: string; validFrom: string; validUntil?: string }[];
}

export async function benefitCards(ctx: DomainContext, person?: Person): Promise<BenefitCard[]> {
  const plans = await ctx.repo.benefits.list();
  const order: BenefitCategory[] = ["saude", "odonto", "outros"];
  const regime: Regime | undefined = person?.regime;
  return order
    .map<BenefitCard | null>((category) => {
      const inCategory = plans.filter((p) => p.category === category);
      const active = inCategory.find((p) => p.active);
      if (!active) return null;
      return {
        category,
        label: capitalize(BENEFIT_CATEGORY_LABELS[category]),
        active,
        eligibleForMe: regime ? active.eligibleRegimes.includes(regime) : undefined,
        previous: inCategory
          .filter((p) => !p.active)
          .sort((a, b) => b.validFrom.localeCompare(a.validFrom))
          .map((p) => ({ providerName: p.providerName, validFrom: p.validFrom, validUntil: p.validUntil })),
      };
    })
    .filter((c): c is BenefitCard => !!c);
}
