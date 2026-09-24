/**
 * Conteúdo editável pelo Admin (D-OB-05): políticas, benefícios, compliance, base de conhecimento,
 * "Quem é quem" e regras de automação. Na Fase 0, tudo em memória.
 */
import { ruleById } from "@/config/automations";
import { addDaysKey } from "@/lib/dates";
import { slugify } from "@/lib/slug";

import { recordAudit } from "../audit";
import { emit } from "../automation-engine";
import type { DomainContext } from "../context";
import { DomainError } from "../context";
import type { BenefitCategory, BenefitPlan, DirectoryEntry, KnowledgeArticle, Policy, Quiz, Regime, TrainingVideo } from "../schemas";

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  saude: "saúde",
  odonto: "odontologia",
  outros: "outros benefícios",
};

export async function currentPolicies(ctx: DomainContext): Promise<Policy[]> {
  const all = await ctx.repo.policies.listVersions();
  const latest = new Map<string, Policy>();
  for (const p of all) {
    const prev = latest.get(p.id);
    if (!prev || p.version > prev.version) latest.set(p.id, p);
  }
  return [...latest.values()];
}

export async function publishPolicyVersion(
  ctx: DomainContext,
  input: { policyId: string; summary: string; bodyMd: string; changelog: string; effectiveFrom: string; isExample?: boolean },
  actorId: string,
): Promise<Policy> {
  const current = (await currentPolicies(ctx)).find((p) => p.id === input.policyId);
  if (!current) throw new DomainError("Política não encontrada.", "NOT_FOUND");
  const next: Policy = {
    ...current,
    version: current.version + 1,
    summary: input.summary,
    bodyMd: input.bodyMd,
    changelog: input.changelog,
    effectiveFrom: input.effectiveFrom,
    isExample: input.isExample ?? current.isExample,
    publishedAt: ctx.clock.nowIso(),
  };
  await ctx.repo.policies.insertVersion(next);
  await ctx.repo.meta.bumpContentVersion();
  await emit(ctx, {
    type: "policy.version_published",
    actorId,
    subjectKey: `${next.id}:v${next.version}`,
    payload: { policyId: next.id, version: next.version, title: next.title, changelog: next.changelog },
  });
  return next;
}

export async function changeBenefitProvider(
  ctx: DomainContext,
  input: {
    category: BenefitCategory;
    providerName: string;
    validFrom: string;
    summaryMd: string;
    howToUseMd: string;
    videoUrl?: string;
    eligibleRegimes: Regime[];
    isExample?: boolean;
  },
  actorId: string,
): Promise<BenefitPlan> {
  const plans = await ctx.repo.benefits.list();
  const current = plans.find((p) => p.category === input.category && p.active);
  if (current && current.providerName.trim().toLowerCase() === input.providerName.trim().toLowerCase()) {
    throw new DomainError(`${current.providerName} já é o provedor ativo.`, "CONFLICT");
  }
  if (current) {
    await ctx.repo.benefits.update(current.id, { active: false, validUntil: addDaysKey(input.validFrom, -1) });
  }
  let id = `${input.category}-${slugify(input.providerName)}`;
  let n = 2;
  while (plans.some((p) => p.id === id)) id = `${input.category}-${slugify(input.providerName)}-${n++}`;
  const plan: BenefitPlan = {
    id,
    category: input.category,
    providerName: input.providerName.trim(),
    active: true,
    validFrom: input.validFrom,
    summaryMd: input.summaryMd,
    howToUseMd: input.howToUseMd,
    videoUrl: input.videoUrl || undefined,
    eligibleRegimes: input.eligibleRegimes,
    isExample: input.isExample ?? true,
  };
  await ctx.repo.benefits.insert(plan);
  await emit(ctx, {
    type: "benefit.provider_changed",
    actorId,
    subjectKey: plan.id,
    payload: {
      planId: plan.id,
      category: plan.category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[plan.category],
      previousProvider: current?.providerName,
      newProvider: plan.providerName,
      validFrom: plan.validFrom,
      eligibleRegimes: plan.eligibleRegimes,
    },
  });
  return plan;
}

export async function setRuleEnabled(ctx: DomainContext, ruleId: string, enabled: boolean, actorId: string): Promise<void> {
  const rule = ruleById(ruleId);
  if (!rule) throw new DomainError("Regra não encontrada.", "NOT_FOUND");
  await ctx.repo.automations.setEnabled(ruleId, enabled);
  await recordAudit(ctx, { type: "rule.toggled", actorId, payload: { ruleId, name: rule.name, enabled } });
}

export async function updateVideo(ctx: DomainContext, patch: Partial<Pick<TrainingVideo, "url" | "durationSec" | "title" | "description">>, actorId: string) {
  const video = await ctx.repo.training.getVideo();
  const changedMedia = patch.url !== undefined && patch.url !== video.url;
  const next: TrainingVideo = {
    ...video,
    ...patch,
    url: patch.url === "" ? undefined : (patch.url ?? video.url),
    version: changedMedia ? video.version + 1 : video.version,
  };
  await ctx.repo.training.saveVideo(next);
  await recordAudit(ctx, { type: "content.updated", actorId, payload: { what: "vídeo de compliance", version: next.version } });
  return next;
}

export async function updateQuiz(ctx: DomainContext, quiz: Omit<Quiz, "version" | "id">, actorId: string) {
  const current = await ctx.repo.training.getQuiz();
  if (quiz.questions.some((q) => q.correctIndex >= q.options.length)) {
    throw new DomainError("Cada pergunta precisa de uma resposta correta entre as opções.");
  }
  const next: Quiz = { ...current, ...quiz, id: current.id, version: current.version + 1 };
  await ctx.repo.training.saveQuiz(next);
  await recordAudit(ctx, { type: "content.updated", actorId, payload: { what: "quiz de compliance", version: next.version } });
  return next;
}

export async function saveArticle(
  ctx: DomainContext,
  input: Omit<KnowledgeArticle, "id" | "updatedAt"> & { id?: string; fromGapId?: string },
  actorId: string,
): Promise<KnowledgeArticle> {
  const articles = await ctx.repo.knowledge.listArticles();
  let id = input.id;
  if (!id) {
    const base = slugify(input.title) || "artigo";
    id = base;
    let n = 2;
    while (articles.some((a) => a.id === id)) id = `${base}-${n++}`;
  }
  const article: KnowledgeArticle = {
    id,
    title: input.title,
    category: input.category,
    summary: input.summary,
    bodyMd: input.bodyMd,
    tags: input.tags,
    ownerPersonId: input.ownerPersonId,
    isExample: input.isExample,
    updatedAt: ctx.clock.nowIso(),
  };
  await ctx.repo.knowledge.saveArticle(article);
  if (input.fromGapId) {
    await ctx.repo.assistant.updateGap(input.fromGapId, { status: "resolvida", resolvedArticleId: article.id });
  }
  await ctx.repo.meta.bumpContentVersion();
  await recordAudit(ctx, { type: "content.updated", actorId, payload: { what: "artigo", id: article.id, title: article.title } });
  return article;
}

export async function saveDirectoryEntry(ctx: DomainContext, entry: DirectoryEntry, actorId: string) {
  await ctx.repo.knowledge.saveDirectoryEntry(entry);
  await ctx.repo.meta.bumpContentVersion();
  await recordAudit(ctx, { type: "content.updated", actorId, payload: { what: "quem é quem", personId: entry.personId } });
}
