/**
 * Abas do topo (seção 4). Nomes, ordem, ícones, status e papéis. Validar com os 5 pilares do
 * documento do Alê antes da demo (seção 17, item 1).
 */
import type { ViewRole } from "@/domain/schemas";

export type ModuleStatus = "ativo" | "beta" | "em_breve";

export type ModuleIconName =
  | "Route"
  | "MessageCircleQuestion"
  | "ScrollText"
  | "Laptop"
  | "Plane"
  | "CalendarClock"
  | "Sprout"
  | "Settings";

export interface ModuleConfig {
  id: string;
  label: string;
  href: string;
  icon: ModuleIconName;
  status: ModuleStatus;
  roles: ViewRole[];
  /** Pilar do documento do Alê a que a aba responde (hipótese, validar). */
  pillar?: string;
}

export const modules: ModuleConfig[] = [
  { id: "onboarding", label: "Onboarding", href: "/onboarding", icon: "Route", status: "ativo", roles: ["ADMIN_RH", "NEW_JOINER"], pillar: "Documentação" },
  { id: "assistente", label: "Assistente", href: "/assistente", icon: "MessageCircleQuestion", status: "ativo", roles: ["ADMIN_RH", "NEW_JOINER", "COLABORADOR"], pillar: "Primeiro dia e agente" },
  { id: "politicas", label: "Políticas e benefícios", href: "/politicas-beneficios", icon: "ScrollText", status: "ativo", roles: ["ADMIN_RH", "NEW_JOINER", "COLABORADOR"] },
  { id: "equipamentos", label: "Equipamentos e acessos", href: "/equipamentos-acessos", icon: "Laptop", status: "ativo", roles: ["ADMIN_RH", "NEW_JOINER", "COLABORADOR"], pillar: "Notebooks, licenças e acessos de projeto" },
  { id: "despesas", label: "Despesas e viagens", href: "/despesas-viagens", icon: "Plane", status: "ativo", roles: ["ADMIN_RH", "NEW_JOINER", "COLABORADOR"], pillar: "Despesas e viagens" },
  { id: "rotina", label: "Rotina e apontamento", href: "/rotina-apontamento", icon: "CalendarClock", status: "beta", roles: ["ADMIN_RH", "NEW_JOINER", "COLABORADOR"], pillar: "Rotina de trabalho e apontamento" },
  { id: "pdi", label: "PDI", href: "/pdi", icon: "Sprout", status: "em_breve", roles: ["ADMIN_RH", "COLABORADOR"] },
];

/** O Admin não é aba: fica na engrenagem do cabeçalho, só para RH. */
export const adminModule: ModuleConfig = {
  id: "admin",
  label: "Admin",
  href: "/admin",
  icon: "Settings",
  status: "ativo",
  roles: ["ADMIN_RH"],
};

export const moduleStatusLabel: Record<ModuleStatus, string | null> = {
  ativo: null,
  beta: "Beta",
  em_breve: "Em breve",
};

export function modulesFor(role: ViewRole): ModuleConfig[] {
  return modules.filter((m) => m.roles.includes(role));
}

/** Módulo dono de um caminho (`/onboarding/casos/x` → onboarding). */
export function moduleForPath(pathname: string): ModuleConfig | undefined {
  return [...modules, adminModule].find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
  );
}

/** Um papel pode abrir o caminho? Caminhos fora dos módulos (ex.: "/") são livres. */
export function canAccessPath(role: ViewRole, pathname: string): boolean {
  const mod = moduleForPath(pathname);
  return mod ? mod.roles.includes(role) : true;
}

/** Página inicial de cada visão (seção 5). */
export function homePathFor(role: ViewRole): string {
  return role === "COLABORADOR" ? "/rotina-apontamento" : "/onboarding";
}
