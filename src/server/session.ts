import "server-only";

import { cookies } from "next/headers";

import { company } from "@/config/company";
import { rolesLabel, viewRoleOf } from "@/domain/roles";
import type { Role, ViewRole } from "@/domain/schemas";
import { firstName } from "@/lib/format";
import { NEW_JOINERS, TEAM } from "@/server/data/seed-fixtures";
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
}

export interface PersonaOption {
  id: string;
  name: string;
  rolesLabel: string;
  group: "equipe" | "new_joiner";
  subtitle?: string;
}

interface PersonRecord {
  id: string;
  name: string;
  roles: Role[];
}

function allPeople(): PersonRecord[] {
  return [
    ...TEAM.map((t) => ({ id: t.id, name: t.name, roles: t.roles })),
    ...NEW_JOINERS.map((n) => ({ id: n.id, name: n.name, roles: ["NEW_JOINER"] as Role[] })),
  ];
}

function toSession(p: PersonRecord): SessionPerson {
  return {
    id: p.id,
    name: p.name,
    firstName: firstName(p.name),
    roles: p.roles,
    viewRole: viewRoleOf(p.roles),
    rolesLabel: rolesLabel(p.roles),
    isManager: p.roles.includes("GESTOR") || p.roles.includes("ADMIN_RH"),
  };
}

/** Persona atual: cookie no modo demo; sem cookie (ou fora do modo demo), o contato de RH. */
export async function getSession(): Promise<SessionPerson> {
  const people = allPeople();
  const fallback = people.find((p) => p.id === company.rhContactPersonId) ?? people[0]!;
  if (!isDemoMode()) return toSession(fallback);
  const store = await cookies();
  const id = store.get(PERSONA_COOKIE)?.value;
  const person = people.find((p) => p.id === id) ?? fallback;
  return toSession(person);
}

/** Personas do seletor "Ver como": Thiago, Enzo e cada new joiner com caso em andamento. */
export async function listPersonas(): Promise<PersonaOption[]> {
  const team = TEAM.filter((t) => t.persona).map<PersonaOption>((t) => ({
    id: t.id,
    name: t.name,
    rolesLabel: rolesLabel(t.roles),
    group: "equipe",
  }));
  const joiners = NEW_JOINERS.filter((n) => n.startOffsetDays >= 0).map<PersonaOption>((n) => ({
    id: n.id,
    name: n.name,
    rolesLabel: "New joiner",
    group: "new_joiner",
    subtitle: `${n.regime}, ${n.jobTitle}`,
  }));
  return [...team, ...joiners];
}

export async function personaExists(id: string): Promise<boolean> {
  return allPeople().some((p) => p.id === id);
}

export async function sessionFor(id: string): Promise<SessionPerson | null> {
  const person = allPeople().find((p) => p.id === id);
  return person ? toSession(person) : null;
}
