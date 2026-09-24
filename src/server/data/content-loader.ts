import "server-only";

/**
 * Carrega o conteúdo editável de `content/` (D-OB-05) e valida cada item com os schemas do
 * domínio. Conteúdo inválido falha na subida, com o nome do arquivo.
 */
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { directorySeed } from "@/config/directory";
import {
  BenefitPlanSchema,
  ContractTemplateSchema,
  EmailTemplateSchema,
  FirstDayAgendaSchema,
  KnowledgeArticleSchema,
  PolicySchema,
  QuizSchema,
  TermDocumentSchema,
  TrainingVideoSchema,
  type BenefitPlan,
  type ContractTemplate,
  type DirectoryEntry,
  type EmailTemplate,
  type FirstDayAgenda,
  type KnowledgeArticle,
  type Policy,
  type Quiz,
  type TermDocument,
  type TrainingVideo,
} from "@/domain/schemas";

export interface LoadedContent {
  policies: Policy[];
  benefitPlans: BenefitPlan[];
  articles: KnowledgeArticle[];
  video: TrainingVideo;
  quiz: Quiz;
  contractTemplates: ContractTemplate[];
  terms: TermDocument[];
  emailTemplates: EmailTemplate[];
  firstDay: FirstDayAgenda;
  directory: DirectoryEntry[];
}

export function contentDir(): string {
  return path.join(process.cwd(), "content");
}

/** YAML converte `2026-08-10` em Date; o domínio usa `YYYY-MM-DD`. */
function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

function readMarkdown(file: string): { data: Record<string, unknown>; body: string } {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  return { data: normalize(parsed.data) as Record<string, unknown>, body: parsed.content.trim() };
}

function listMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => path.join(dir, f));
}

function parseOrThrow<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { message: string } } }, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Conteúdo inválido em ${path.relative(process.cwd(), file)}: ${result.error.message}`);
  }
  return result.data;
}

function isoFromDateKey(key: string): string {
  return `${key}T12:00:00.000Z`;
}

function loadPolicies(root: string): Policy[] {
  const files = [...listMarkdown(path.join(root, "politicas")), path.join(root, "termos", "privacidade.md")];
  return files
    .filter((f) => fs.existsSync(f))
    .map((file) => {
      const { data, body } = readMarkdown(file);
      const effectiveFrom = String(data.effectiveFrom ?? "");
      return parseOrThrow(
        PolicySchema,
        { ...data, bodyMd: body, publishedAt: isoFromDateKey(effectiveFrom) },
        file,
      );
    });
}

function loadBenefits(root: string): BenefitPlan[] {
  return listMarkdown(path.join(root, "beneficios")).map((file) => {
    const { data, body } = readMarkdown(file);
    const [summary, howTo] = body.split(/^## Como usar\s*$/m);
    return parseOrThrow(
      BenefitPlanSchema,
      { ...data, summaryMd: (summary ?? "").trim(), howToUseMd: (howTo ?? "").trim() },
      file,
    );
  });
}

function loadArticles(root: string): KnowledgeArticle[] {
  return listMarkdown(path.join(root, "kb")).map((file) => {
    const { data, body } = readMarkdown(file);
    const updatedAt = String(data.updatedAt ?? "2026-01-01");
    return parseOrThrow(
      KnowledgeArticleSchema,
      { ...data, bodyMd: body, updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(updatedAt) ? isoFromDateKey(updatedAt) : updatedAt },
      file,
    );
  });
}

function loadJson<T>(file: string, schema: Parameters<typeof parseOrThrow<T>>[0]): T {
  return parseOrThrow(schema, JSON.parse(fs.readFileSync(file, "utf8")), file);
}

function loadTerms(root: string): TermDocument[] {
  const file = path.join(root, "termos", "notebook.md");
  const { data, body } = readMarkdown(file);
  return [parseOrThrow(TermDocumentSchema, { ...data, bodyMd: body }, file)];
}

function loadEmailTemplates(root: string): EmailTemplate[] {
  return listMarkdown(path.join(root, "emails")).map((file) => {
    const { data, body } = readMarkdown(file);
    return parseOrThrow(EmailTemplateSchema, { ...data, bodyMd: body }, file);
  });
}

function loadFirstDay(root: string): FirstDayAgenda {
  const file = path.join(root, "primeiro-dia.md");
  const { data, body } = readMarkdown(file);
  return parseOrThrow(FirstDayAgendaSchema, { ...data, bodyMd: body }, file);
}

export function loadContent(root: string = contentDir()): LoadedContent {
  const contractTemplates = JSON.parse(
    fs.readFileSync(path.join(root, "contratos", "modelos.json"), "utf8"),
  ) as unknown[];
  return {
    policies: loadPolicies(root),
    benefitPlans: loadBenefits(root),
    articles: loadArticles(root),
    video: loadJson(path.join(root, "compliance", "video.json"), TrainingVideoSchema),
    quiz: loadJson(path.join(root, "compliance", "quiz.json"), QuizSchema),
    contractTemplates: contractTemplates.map((t) =>
      parseOrThrow(ContractTemplateSchema, t, path.join(root, "contratos", "modelos.json")),
    ),
    terms: loadTerms(root),
    emailTemplates: loadEmailTemplates(root),
    firstDay: loadFirstDay(root),
    directory: structuredClone(directorySeed),
  };
}
