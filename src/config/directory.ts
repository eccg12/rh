/**
 * "Quem é quem" (seção 11.1): temas de cada pessoa, categorias da base que ela responde e canal.
 * Usado no primeiro dia, no assistente (encaminhamento) e no Admin. Itens com `toValidate` ainda
 * precisam de confirmação da própria pessoa (seção 17, item 11).
 */
import type { DirectoryEntry } from "@/domain/schemas";

export const directorySeed: DirectoryEntry[] = [
  {
    personId: "thiago-stepanoff",
    topics: [
      "Contratos e documentação",
      "Despesas e reembolsos",
      "Notebook e equipamentos",
      "Benefícios",
    ],
    categories: ["pj", "despesas", "viagens", "equipamentos", "beneficios", "compliance", "primeiro_dia", "geral"],
    channel: "chat da equipe",
    toValidate: false,
  },
  {
    personId: "guilherme-bonfitto",
    topics: ["Experiência do new joiner", "Desenvolvimento e PDI"],
    categories: ["rotina"],
    channel: "chat da equipe",
    toValidate: true,
  },
  {
    personId: "alessandro-benetti",
    topics: ["Alocação e acessos de projeto"],
    categories: ["ti"],
    channel: "chat da equipe",
    toValidate: true,
  },
  {
    personId: "enzo-craveiro",
    topics: ["Plataforma, ferramentas digitais e IA"],
    categories: [],
    channel: "chat da equipe",
    toValidate: true,
  },
];
