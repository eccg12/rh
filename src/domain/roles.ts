import type { Role, ViewRole } from "@/domain/schemas";

/**
 * Visão principal de uma pessoa (D-OB-08): RH se tiver o papel; senão new joiner; senão
 * colaborador. GESTOR é capacidade adicional (ex.: ver horas da equipe), não uma visão própria.
 */
export function viewRoleOf(roles: readonly Role[]): ViewRole {
  if (roles.includes("ADMIN_RH")) return "ADMIN_RH";
  if (roles.includes("NEW_JOINER")) return "NEW_JOINER";
  return "COLABORADOR";
}

export const roleLabels: Record<Role, string> = {
  ADMIN_RH: "RH",
  GESTOR: "Gestor",
  COLABORADOR: "Colaborador",
  NEW_JOINER: "New joiner",
};

export const viewRoleLabels: Record<ViewRole, string> = {
  ADMIN_RH: "RH",
  NEW_JOINER: "New joiner",
  COLABORADOR: "Colaborador",
};

/** "RH e gestor", "Colaborador e gestor", "New joiner". */
export function rolesLabel(roles: readonly Role[]): string {
  const ordered = (["ADMIN_RH", "NEW_JOINER", "COLABORADOR", "GESTOR"] as const).filter((r) =>
    roles.includes(r),
  );
  const labels = ordered.map((r, i) => (i === 0 ? roleLabels[r] : roleLabels[r].toLowerCase()));
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

export function isManager(roles: readonly Role[]): boolean {
  return roles.includes("GESTOR") || roles.includes("ADMIN_RH");
}
