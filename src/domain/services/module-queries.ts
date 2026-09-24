/**
 * Conteúdo das abas Despesas e viagens (seção 9.7) e Rotina e apontamento (seção 9.8). Tudo vem da
 * base de conhecimento, das políticas vigentes e de `company.expenseTool`.
 */
import { company } from "@/config/company";

import type { DomainContext } from "../context";
import type { KnowledgeArticle } from "../schemas";
import { myPolicies, type PolicyListItem } from "./policy-queries";

export interface ArticleView {
  id: string;
  title: string;
  summary: string;
  bodyMd: string;
  isExample: boolean;
  updatedAt: string;
}

function toArticle(a: KnowledgeArticle): ArticleView {
  return { id: a.id, title: a.title, summary: a.summary, bodyMd: a.bodyMd, isExample: a.isExample, updatedAt: a.updatedAt };
}

export interface ExpensesOverview {
  tool: { name: string; url: string; urlToValidate: boolean };
  howTo?: ArticleView;
  tutorials: { id: string; title: string; durationSec: number; url?: string }[];
  travelPolicy?: PolicyListItem;
  faq: { category: "despesas" | "viagens"; label: string; articles: ArticleView[] }[];
  reimbursementsComingSoon: string;
}

export async function expensesOverview(ctx: DomainContext, personId: string): Promise<ExpensesOverview> {
  const [articles, policies] = await Promise.all([ctx.repo.knowledge.listArticles(), myPolicies(ctx, personId)]);
  const tool = company.expenseTool;
  const howTo = articles.find((a) => a.id === tool.howToArticleId);
  const faqOf = (category: "despesas" | "viagens") =>
    articles
      .filter((a) => a.category === category && a.id !== tool.howToArticleId)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
      .map(toArticle);
  return {
    tool: { name: tool.name, url: tool.url, urlToValidate: tool.urlToValidate },
    howTo: howTo ? toArticle(howTo) : undefined,
    tutorials: tool.tutorials,
    travelPolicy: policies.find((p) => p.category === "viagens"),
    faq: [
      { category: "despesas" as const, label: "Despesas e reembolsos", articles: faqOf("despesas") },
      { category: "viagens" as const, label: "Viagens", articles: faqOf("viagens") },
    ].filter((g) => g.articles.length > 0),
    reimbursementsComingSoon: tool.reimbursementsComingSoon,
  };
}

export interface RoutineOverview {
  policy?: PolicyListItem & { bodyMd: string };
  rituals?: ArticleView;
}

export async function routineOverview(ctx: DomainContext, personId: string): Promise<RoutineOverview> {
  const [articles, policies, versions] = await Promise.all([
    ctx.repo.knowledge.listArticles(),
    myPolicies(ctx, personId),
    ctx.repo.policies.listVersions(),
  ]);
  const policy = policies.find((p) => p.category === "rotina");
  const body = policy ? versions.find((v) => v.id === policy.id && v.version === policy.version)?.bodyMd : undefined;
  const rituals = articles.find((a) => a.id === "rotina-e-rituais");
  return {
    policy: policy && body !== undefined ? { ...policy, bodyMd: body } : undefined,
    rituals: rituals ? toArticle(rituals) : undefined,
  };
}
