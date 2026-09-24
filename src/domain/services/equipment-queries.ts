/**
 * Equipamentos e acessos (seção 9.6): o que está com cada pessoa, o inventário do RH, o cadastro de
 * equipamentos e os acessos pendentes por pessoa.
 */
import { recordAudit } from "../audit";
import { ACCESS_OWNER_LABELS, EQUIPMENT_TYPE_LABELS, equipmentDisplayName } from "../equipment";
import type { DomainContext } from "../context";
import { DomainError } from "../context";
import type { NewEquipmentInput } from "../inputs";
import type { AccessGrant, Equipment, EquipmentType, TermDocument } from "../schemas";
import { loadCaseView } from "../workflow-engine";

export const NOTEBOOK_TERM_ID = "termo-notebook";

export interface MyEquipmentItem {
  id: string;
  assetTag: string;
  type: EquipmentType;
  typeLabel: string;
  /** Tipo e modelo sem repetir a palavra ("Monitor 24\" Full HD"). */
  name: string;
  model: string;
  serial: string;
  assignedAt?: string;
  termAcceptedAt?: string;
  termVersion?: number;
  /** Só o notebook tem termo de responsabilidade (content/termos/notebook.md). */
  termRequired: boolean;
}

export interface MyAccessItem {
  id: string;
  system: string;
  ownerLabel: string;
  status: AccessGrant["status"];
  grantedAt?: string;
}

export interface MyEquipment {
  items: MyEquipmentItem[];
  term?: TermDocument;
  corporateEmail?: string;
  /** Para quem está no onboarding: o e-mail ainda está sendo criado. */
  emailPending: boolean;
  accesses: MyAccessItem[];
  /** Quem está no onboarding e ainda não recebeu o notebook. */
  notebookPending: boolean;
}

function toItem(e: Equipment): MyEquipmentItem {
  return {
    id: e.id,
    assetTag: e.assetTag,
    type: e.type,
    typeLabel: EQUIPMENT_TYPE_LABELS[e.type],
    name: equipmentDisplayName(e.type, e.model),
    model: e.model,
    serial: e.serial,
    assignedAt: e.assignedAt,
    termAcceptedAt: e.termAcceptedAt,
    termVersion: e.termVersion,
    termRequired: e.type === "notebook",
  };
}

export async function myEquipment(ctx: DomainContext, personId: string): Promise<MyEquipment> {
  const [person, equipment, grants, terms, c] = await Promise.all([
    ctx.repo.people.get(personId),
    ctx.repo.equipment.list(),
    ctx.repo.access.list(),
    ctx.repo.knowledge.listTerms(),
    ctx.repo.cases.getByPerson(personId),
  ]);
  const items = equipment.filter((e) => e.assignedToId === personId && e.status === "em_uso").map(toItem);
  const inOnboarding = c?.status === "em_andamento";
  return {
    items,
    term: terms.find((t) => t.id === NOTEBOOK_TERM_ID),
    corporateEmail: person?.corporateEmail,
    emailPending: inOnboarding && !person?.corporateEmail,
    accesses: grants
      .filter((g) => g.personId === personId && g.status !== "revogado")
      .map((g) => ({ id: g.id, system: g.system, ownerLabel: ACCESS_OWNER_LABELS[g.owner], status: g.status, grantedAt: g.grantedAt })),
    notebookPending: inOnboarding && !!c?.needsNotebook && !items.some((i) => i.type === "notebook"),
  };
}

export interface InventoryItem extends MyEquipmentItem {
  status: Equipment["status"];
  notes?: string;
  assignee?: { id: string; name: string };
}

export interface PendingAccessGroup {
  person: { id: string; name: string; detail?: string };
  grants: { id: string; system: string; ownerLabel: string; blockedReason?: string }[];
}

export interface Inventory {
  items: InventoryItem[];
  counts: { total: number; disponivel: number; emUso: number; manutencao: number; termoPendente: number };
  people: { id: string; name: string; detail?: string }[];
  /** Acessos que o RH já pode liberar, por pessoa. */
  pendingAccess: PendingAccessGroup[];
  /** Quem ainda não assinou o contrato: os acessos esperam (resumo, sem ação). */
  waitingContract: { person: { id: string; name: string }; systems: string[] }[];
}

export async function inventory(ctx: DomainContext): Promise<Inventory> {
  const [equipment, people, grants, cases] = await Promise.all([
    ctx.repo.equipment.list(),
    ctx.repo.people.list(),
    ctx.repo.access.list(),
    ctx.repo.cases.list(),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const caseByPerson = new Map(cases.map((c) => [c.personId, c]));
  const detailOf = (personId: string): string | undefined => {
    const c = caseByPerson.get(personId);
    if (!c) return undefined;
    return c.status === "em_andamento" ? "Em onboarding" : c.status === "concluido" ? "Onboarding concluído" : undefined;
  };

  const items: InventoryItem[] = equipment
    .map((e) => {
      const person = e.assignedToId ? byId.get(e.assignedToId) : undefined;
      return { ...toItem(e), status: e.status, notes: e.notes, assignee: person ? { id: person.id, name: person.name } : undefined };
    })
    .sort((a, b) => a.assetTag.localeCompare(b.assetTag));

  // Acessos pendentes, com o motivo quando ainda não dá para liberar (antes do contrato).
  const pending = grants.filter((g) => g.status === "pendente");
  const groups = new Map<string, PendingAccessGroup>();
  const blockedCases = new Map<string, boolean>();
  for (const g of pending) {
    let blockedReason: string | undefined;
    if (g.caseId) {
      if (!blockedCases.has(g.caseId)) {
        const view = await loadCaseView(ctx, g.caseId);
        blockedCases.set(g.caseId, view.tasks.find((t) => t.def.id === "acessos")?.status === "bloqueada");
      }
      if (blockedCases.get(g.caseId)) blockedReason = "Liberado depois da assinatura do contrato.";
    }
    const person = byId.get(g.personId);
    const group = groups.get(g.personId) ?? {
      person: { id: g.personId, name: person?.name ?? g.personId, detail: detailOf(g.personId) },
      grants: [],
    };
    group.grants.push({ id: g.id, system: g.system, ownerLabel: ACCESS_OWNER_LABELS[g.owner], blockedReason });
    groups.set(g.personId, group);
  }

  const allGroups = [...groups.values()].sort((a, b) => a.person.name.localeCompare(b.person.name, "pt-BR"));
  const actionable = allGroups
    .map((g) => ({ ...g, grants: g.grants.filter((x) => !x.blockedReason) }))
    .filter((g) => g.grants.length > 0);
  const waitingContract = allGroups
    .filter((g) => g.grants.every((x) => x.blockedReason))
    .map((g) => ({ person: { id: g.person.id, name: g.person.name }, systems: g.grants.map((x) => x.system) }));

  const activePeople = people
    .filter((p) => caseByPerson.get(p.id)?.status !== "cancelado")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((p) => ({ id: p.id, name: p.name, detail: detailOf(p.id) }));

  return {
    items,
    counts: {
      total: items.length,
      disponivel: items.filter((i) => i.status === "disponivel").length,
      emUso: items.filter((i) => i.status === "em_uso").length,
      manutencao: items.filter((i) => i.status === "manutencao").length,
      termoPendente: items.filter((i) => i.status === "em_uso" && i.termRequired && !i.termAcceptedAt).length,
    },
    people: activePeople,
    pendingAccess: actionable,
    waitingContract,
  };
}

/** Próximo patrimônio livre do tipo (ex.: MON-NB-007). */
export async function suggestAssetTag(ctx: DomainContext, type: EquipmentType): Promise<string> {
  const prefix = { notebook: "MON-NB", monitor: "MON-MN", headset: "MON-HS", outros: "MON-OU" }[type];
  const used = (await ctx.repo.equipment.list())
    .map((e) => e.assetTag)
    .filter((t) => t.startsWith(`${prefix}-`))
    .map((t) => Number(t.slice(prefix.length + 1)))
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export async function registerEquipment(ctx: DomainContext, input: NewEquipmentInput, actorId: string): Promise<Equipment> {
  const assetTag = input.assetTag.trim().toUpperCase();
  const all = await ctx.repo.equipment.list();
  if (all.some((e) => e.assetTag.toUpperCase() === assetTag)) {
    throw new DomainError(`O patrimônio ${assetTag} já está cadastrado.`, "CONFLICT");
  }
  if (all.some((e) => e.serial.toUpperCase() === input.serial.trim().toUpperCase())) {
    throw new DomainError(`Já existe um equipamento com o número de série ${input.serial.trim()}.`, "CONFLICT");
  }
  const item: Equipment = {
    id: ctx.repo.newId("eq"),
    assetTag,
    type: input.type,
    model: input.model.trim(),
    serial: input.serial.trim(),
    status: "disponivel",
  };
  await ctx.repo.equipment.insert(item);
  await recordAudit(ctx, {
    type: "equipment.registered",
    actorId,
    payload: { equipmentId: item.id, assetTag: item.assetTag, model: item.model, type: item.type },
  });
  return item;
}
