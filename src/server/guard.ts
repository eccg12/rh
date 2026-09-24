import "server-only";

import { adminModule, modules, type ModuleConfig } from "@/config/modules";
import { getSession, type SessionPerson } from "@/server/session";

/** Confere se a persona atual pode abrir o módulo (visão por papel, D-OB-08). */
export async function guardModule(
  moduleId: string,
): Promise<{ session: SessionPerson; allowed: boolean; module: ModuleConfig }> {
  const session = await getSession();
  const mod = [...modules, adminModule].find((m) => m.id === moduleId);
  if (!mod) throw new Error(`Módulo desconhecido: ${moduleId}`);
  return { session, allowed: mod.roles.includes(session.viewRole), module: mod };
}
