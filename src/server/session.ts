import "server-only";

import { cookies } from "next/headers";

import { company } from "@/config/company";
import { rolesLabel, viewRoleOf } from "@/domain/roles";
import type { DomainContext } from "@/domain/context";
import type { Person, Role, ViewRole } from "@/domain/schemas";
import { firstName } from "@/lib/format";
import { TEAM } from "@/server/data/seed-fixtures";
import { getDomain } from "@/server/domain";
import { isDemoMode } from "@/server/env";

/** Cookie da persona de demo (D-OB-08). Na Fase 1, NextAuth substitui. */
export const PERSONA_COOKIE = "demo_persona";

export interface SessionPerson {
  id: string;
  name: string;
  firstName: string;
  roles: Role[];
  viewRole: ViewRole;
  rolesLabel: string;
  isManager: boolean;
  /** Caso de onboarding em andamento ou concluído (new joiner). */
  caseId?: string;
}

export interface PersonaOption {
  id: string;
  name: string;
  rolesLabel: string;
  group: "equipe" | "new_joiner";
  subtitle?: string;
}

function toSession(p: Person, caseId?: string): SessionPerson {
  return {
    id: p.id,
    name: p.name,
    firstName: p.preferredName ?? firstName(p.name),
    roles: p.roles,
    viewRole: viewRoleOf(p.roles),
    rolesLabel: rolesLabel(p.roles),
    isManager: p.roles.includes("GESTOR") || p.roles.includes("ADMIN_RH"),
    caseId,
  };
}

/** Persona a partir do id do cookie; sem cookie (ou fora do modo demo), o contato de RH. */
export async function resolveSession(ctx: DomainContext, personaId: string | undefined): Promise<SessionPerson> {
  const id = isDemoMode() && personaId ? personaId : company.rhContactPersonId;
  const person = (await ctx.repo.people.get(id)) ?? (await ctx.repo.people.get(company.rhContactPersonId));
  if (!person) throw new Error("Contato de RH não encontrado nos dados.");
  const c = await ctx.repo.cases.getByPerson(person.id);
  return toSession(person, c?.id);
}

export function personaFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === PERSONA_COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** Sessão para Server Components. */
export async function getSession(): Promise<SessionPerson> {
  const store = await cookies();
  return resolveSession(await getDomain(), store.get(PERSONA_COOKIE)?.value);
}

/** Personas do seletor "Ver como": Thiago, Enzo e cada new joiner com caso em andamento. */
export async function listPersonas(ctx?: DomainContext): Promise<PersonaOption[]> {
  const domain = ctx ?? (await getDomain());
  const [people, cases] = await Promise.all([domain.repo.people.list(), domain.repo.cases.list()]);
  const team = TEAM.filter((t) => t.persona)
    .map((t) => people.find((p) => p.id === t.id))
    .filter((p): p is Person => !!p)
    .map<PersonaOption>((p) => ({ id: p.id, name: p.name, rolesLabel: rolesLabel(p.roles), group: "equipe" }));
  const joiners = cases
    .filter((c) => c.status === "em_andamento")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((c) => people.find((p) => p.id === c.personId))
    .filter((p): p is Person => !!p)
    .map<PersonaOption>((p) => ({
      id: p.id,
      name: p.name,
      rolesLabel: "New joiner",
      group: "new_joiner",
      subtitle: [p.regime, p.jobTitle].filter(Boolean).join(", "),
    }));
  return [...team, ...joiners];
}

export async function sessionFor(id: string): Promise<SessionPerson | null> {
  const ctx = await getDomain();
  const person = await ctx.repo.people.get(id);
  if (!person) return null;
  const c = await ctx.repo.cases.getByPerson(person.id);
  return toSession(person, c?.id);
}
