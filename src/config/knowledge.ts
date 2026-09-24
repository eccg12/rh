/**
 * Categorias da base de conhecimento: rótulos, ordem de exibição e a categoria usada para
 * encaminhar dúvidas sobre cada política (seção 10.2, item 5).
 */
import type { KbCategory, PolicyCategory } from "@/domain/schemas";

export const KB_CATEGORY_LABELS: Record<KbCategory, string> = {
  primeiro_dia: "Primeiro dia",
  despesas: "Despesas e reembolsos",
  viagens: "Viagens",
  beneficios: "Benefícios",
  equipamentos: "Equipamentos",
  ti: "TI e acessos",
  rotina: "Rotina de trabalho",
  compliance: "Compliance",
  pj: "PJ e nota fiscal",
  geral: "Geral",
};

export const KB_CATEGORY_ORDER = Object.keys(KB_CATEGORY_LABELS) as KbCategory[];

export const POLICY_KB_CATEGORY: Record<PolicyCategory, KbCategory> = {
  conduta: "compliance",
  viagens: "viagens",
  ti: "ti",
  rotina: "rotina",
  privacidade: "geral",
  outros: "geral",
};
