import "server-only";

/**
 * Índice do assistente (seção 10.1). Entram, direto da fonte: artigos da base, a versão vigente de
 * cada política, os benefícios ativos, a agenda do primeiro dia e o "Quem é quem". Trocar o plano
 * de saúde muda a resposta sem editar artigo.
 *
 * O índice é refeito sempre que o conteúdo muda: a chave é uma impressão digital do próprio
 * conteúdo, então edições no Admin, versões novas e a restauração da demo entram na hora.
 */
import { createHash } from "node:crypto";

import MiniSearch from "minisearch";

import { company } from "@/config/company";
import { KB_CATEGORY_LABELS, POLICY_KB_CATEGORY } from "@/config/knowledge";
import type { DomainContext } from "@/domain/context";
import type { BenefitCategory, BenefitPlan, DirectoryEntry, KbCategory, Person, PolicyCategory } from "@/domain/schemas";
import { BENEFIT_CATEGORY_LABELS, currentPolicies } from "@/domain/services/content";
import { formatDate } from "@/lib/dates";

import { processTerm, tokenize } from "./text";

export type KnowledgeKind = "artigo" | "politica" | "beneficio" | "primeiro_dia" | "quem_e_quem";

export interface KnowledgeDoc {
  id: string;
  kind: KnowledgeKind;
  title: string;
  category: KbCategory;
  summary: string;
  bodyMd: string;
  tags: string[];
  isExample: boolean;
  ownerPersonId?: string;
  /** Data de atualização ou de vigência (YYYY-MM-DD). */
  updatedAt?: string;
  version?: number;
  /** Página do produto com o conteúdo completo, quando existe. */
  href?: string;
}

export interface AssistantIndex {
  key: string;
  docs: Map<string, KnowledgeDoc>;
  search: MiniSearch<KnowledgeDoc>;
  directory: DirectoryEntry[];
  people: Map<string, Person>;
}

export const KIND_LABELS: Record<KnowledgeKind, string> = {
  artigo: "Base de conhecimento",
  politica: "Política",
  beneficio: "Benefícios",
  primeiro_dia: "Primeiro dia",
  quem_e_quem: "Quem é quem",
};

const BENEFIT_TITLES: Record<BenefitCategory, (provider: string) => string> = {
  saude: (provider) => `Plano de saúde: ${provider}`,
  odonto: (provider) => `Plano odontológico: ${provider}`,
  outros: (provider) => `Benefício: ${provider}`,
};

const BENEFIT_TAGS: Record<BenefitCategory, string[]> = {
  saude: ["plano de saúde", "saúde", "convênio", "médico", "consulta", "hospital", "carteirinha", "rede credenciada", "dependentes", "benefício"],
  odonto: ["plano odontológico", "odontológico", "dentista", "odonto", "benefício"],
  outros: ["benefício", "benefícios"],
};

const POLICY_TAGS: Record<PolicyCategory, string[]> = {
  conduta: ["política", "código de conduta", "ética", "compliance"],
  viagens: ["política", "viagens"],
  ti: ["política", "ti", "segurança da informação"],
  rotina: ["política", "rotina"],
  privacidade: ["política", "privacidade", "lgpd", "dados pessoais"],
  outros: ["política"],
};

/** Texto simples a partir de Markdown (para resumos). */
export function plainText(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstParagraph(md: string): string {
  const block = md.split(/\n\s*\n/).find((b) => b.trim() && !/^\s*(#|[-*]\s|\d+\.\s)/.test(b));
  return plainText(block ?? md).slice(0, 280);
}

function benefitDoc(plan: BenefitPlan): KnowledgeDoc {
  const regimes = plan.eligibleRegimes.join(" e ");
  return {
    id: `beneficio:${plan.id}`,
    kind: "beneficio",
    title: BENEFIT_TITLES[plan.category](plan.providerName),
    category: "beneficios",
    summary: firstParagraph(plan.summaryMd),
    bodyMd: [
      plan.summaryMd.trim(),
      `## Como usar\n\n${plan.howToUseMd.trim()}`,
      `Elegibilidade: ${regimes}. Em vigor desde ${formatDate(plan.validFrom)}.`,
    ].join("\n\n"),
    tags: [...BENEFIT_TAGS[plan.category], plan.providerName, BENEFIT_CATEGORY_LABELS[plan.category]],
    isExample: plan.isExample,
    updatedAt: plan.validFrom,
    href: "/politicas-beneficios#beneficios",
  };
}

function directoryDoc(directory: DirectoryEntry[], people: Map<string, Person>): KnowledgeDoc {
  const lines = directory
    .map((entry) => {
      const person = people.get(entry.personId);
      if (!person) return null;
      const role = person.jobTitle ? ` (${person.jobTitle})` : "";
      return `- **${person.name}**${role}: ${entry.topics.join(", ")}. Canal: ${entry.channel}.`;
    })
    .filter((l): l is string => !!l);
  return {
    id: "quem-e-quem",
    kind: "quem_e_quem",
    title: "Quem é quem: com quem falar sobre cada assunto",
    category: "geral",
    summary: "As pessoas da equipe, os temas de cada uma e o canal de contato.",
    bodyMd: [`Para dúvidas que a base não cobre, fale com a pessoa do tema:`, lines.join("\n")].join("\n\n"),
    tags: ["contato", "responsável", "equipe", "pessoas", "quem é quem"],
    isExample: false,
  };
}

/** Documentos do índice, lidos do repositório (nunca de casos, fichas ou documentos, D-OB-06). */
export async function loadKnowledgeDocs(
  ctx: DomainContext,
): Promise<{ docs: KnowledgeDoc[]; directory: DirectoryEntry[]; people: Person[] }> {
  const [articles, policies, benefits, firstDay, directory, people] = await Promise.all([
    ctx.repo.knowledge.listArticles(),
    currentPolicies(ctx),
    ctx.repo.benefits.list(),
    ctx.repo.knowledge.getFirstDay(),
    ctx.repo.knowledge.listDirectory(),
    ctx.repo.people.list(),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const docs: KnowledgeDoc[] = [
    ...articles.map<KnowledgeDoc>((a) => ({
      id: `kb:${a.id}`,
      kind: "artigo",
      title: a.title,
      category: a.category,
      summary: a.summary,
      bodyMd: a.bodyMd,
      tags: a.tags,
      isExample: a.isExample,
      ownerPersonId: a.ownerPersonId,
      updatedAt: a.updatedAt.slice(0, 10),
    })),
    ...policies.map<KnowledgeDoc>((p) => ({
      id: `politica:${p.id}`,
      kind: "politica",
      title: p.title,
      category: POLICY_KB_CATEGORY[p.category],
      summary: p.summary,
      bodyMd: p.changelog ? `${p.bodyMd.trim()}\n\n## O que mudou na versão ${p.version}\n\n${p.changelog}` : p.bodyMd,
      tags: POLICY_TAGS[p.category],
      isExample: p.isExample,
      updatedAt: p.effectiveFrom,
      version: p.version,
      href: `/politicas-beneficios/${p.id}`,
    })),
    ...benefits.filter((b) => b.active).map(benefitDoc),
    {
      id: "primeiro-dia",
      kind: "primeiro_dia",
      title: firstDay.title,
      category: "primeiro_dia",
      summary: firstDay.intro,
      bodyMd: [
        firstDay.intro,
        firstDay.items.map((i) => `- **${i.time}** — ${i.title}${i.detail ? `. ${i.detail}` : ""}`).join("\n"),
        firstDay.bodyMd,
      ]
        .filter((s) => s.trim())
        .join("\n\n"),
      tags: ["agenda", "programação", "horários", "primeiro dia"],
      isExample: firstDay.isExample,
    },
    directoryDoc(directory, peopleById),
  ];
  return { docs, directory, people };
}

function buildSearch(docs: KnowledgeDoc[]): MiniSearch<KnowledgeDoc> {
  const search = new MiniSearch<KnowledgeDoc>({
    idField: "id",
    fields: ["title", "tags", "summary", "body"],
    extractField: (doc, field) => {
      if (field === "tags") return doc.tags.join(" ");
      if (field === "body") return doc.bodyMd;
      if (field === "id") return doc.id;
      return field === "title" ? doc.title : doc.summary;
    },
    tokenize: (text) => tokenize(text),
    processTerm: (term) => processTerm(term),
    searchOptions: {
      boost: { title: 3, tags: 2 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "OR",
    },
  });
  search.addAll(docs);
  return search;
}

let cache: AssistantIndex | undefined;

export async function getAssistantIndex(ctx: DomainContext): Promise<AssistantIndex> {
  const { docs, directory, people } = await loadKnowledgeDocs(ctx);
  const key = createHash("sha1")
    .update(JSON.stringify({ docs, directory }))
    .digest("hex");
  if (cache?.key === key) return cache;
  cache = {
    key,
    docs: new Map(docs.map((d) => [d.id, d])),
    search: buildSearch(docs),
    directory,
    people: new Map(people.map((p) => [p.id, p])),
  };
  return cache;
}

/** Quem responde por uma categoria da base; sem correspondência, o contato padrão (seção 10.2, item 5). */
export function personForCategory(directory: DirectoryEntry[], category: KbCategory | undefined): string {
  if (category) {
    const entry = directory.find((d) => d.categories.includes(category));
    if (entry) return entry.personId;
  }
  return company.defaultRoutingPersonId;
}

export function categoryLabel(category: KbCategory): string {
  return KB_CATEGORY_LABELS[category];
}
