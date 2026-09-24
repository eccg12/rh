/** Leituras do Admin (seção 9.10). */
import type { AdminSectionId } from "@/config/admin-sections";
import { automationRules, type RecipientRef, type RuleAction } from "@/config/automations";
import { KB_CATEGORY_LABELS } from "@/config/knowledge";
import { allTasks, workflows } from "@/config/workflows";
import { formatDate, formatDateTime } from "@/lib/dates";
import { plural } from "@/lib/format";

import { isRuleEnabled } from "../automation-engine";
import type { DomainContext } from "../context";
import { eventLabel } from "../events";
import { AUTOMATION_ACTOR, SYSTEM_ACTOR, type AuditEvent, type KbCategory, type Person } from "../schemas";
import { describeAudit, type TimelineEntry } from "../timeline";
import { currentPolicies } from "./content";
import { ackMatrix } from "./policy-queries";

export async function outbox(ctx: DomainContext) {
  const [emails, cases, people] = await Promise.all([ctx.repo.email.listOutbox(), ctx.repo.cases.list(), ctx.repo.people.list()]);
  const personOfCase = new Map(cases.map((c) => [c.id, people.find((p) => p.id === c.personId)?.name ?? c.personId]));
  const ruleName = new Map(automationRules.map((r) => [r.id, r.name]));
  // Links absolutos (APP_URL) viram relativos para funcionar em qualquer host da demo.
  const base = ctx.appUrl.replace(/\/+$/, "");
  return emails
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => ({
      ...e,
      bodyHtml: base ? e.bodyHtml.split(`href="${base}/`).join('href="/') : e.bodyHtml,
      ruleName: e.ruleId ? ruleName.get(e.ruleId) : undefined,
      caseName: e.caseId ? personOfCase.get(e.caseId) : undefined,
    }));
}

export type OutboxItem = Awaited<ReturnType<typeof outbox>>[number];

// ---------------------------------------------------------------------------------------------
// Início do Admin, automações, políticas, benefícios, compliance, base, quem é quem, pesquisa
// ---------------------------------------------------------------------------------------------

const RECIPIENT_LABELS: Record<RecipientRef, string> = {
  new_joiner: "quem está entrando",
  rh: "RH",
  ti: "TI",
  gestor: "gestor do projeto",
  task_owner: "dono da tarefa",
  people_active: "todas as pessoas ativas",
  people_eligible: "pessoas elegíveis",
};

export interface AdminOverview {
  counts: Partial<Record<AdminSectionId, string>>;
}

export async function adminOverview(ctx: DomainContext): Promise<AdminOverview> {
  const [emails, firings, gaps, articles, directory, surveys, audit, policies, benefits, video, quiz, matrix] = await Promise.all([
    ctx.repo.email.listOutbox(),
    ctx.repo.automations.listFirings(),
    ctx.repo.assistant.listGaps(),
    ctx.repo.knowledge.listArticles(),
    ctx.repo.knowledge.listDirectory(),
    ctx.repo.surveys.list(),
    ctx.repo.audit.list(),
    currentPolicies(ctx),
    ctx.repo.benefits.list(),
    ctx.repo.training.getVideo(),
    ctx.repo.training.getQuiz(),
    ackMatrix(ctx),
  ]);
  const enabled = await Promise.all(automationRules.map((r) => isRuleEnabled(ctx, r)));
  const since = Date.parse(ctx.clock.nowIso()) - 30 * 86_400_000;
  const recentFirings = firings.filter((f) => Date.parse(f.firedAt) >= since).length;
  const openGaps = gaps.filter((g) => g.status === "aberta").length;
  const scores = surveys.map((s) => s.nps);
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
  return {
    counts: {
      "caixa-de-saida": plural(emails.length, "e-mail simulado", "e-mails simulados"),
      automacoes: `${enabled.filter(Boolean).length} de ${automationRules.length} regras ligadas, ${plural(recentFirings, "disparo", "disparos")} em 30 dias`,
      fluxos: "PJ em uso, CLT em validação",
      politicas: `${plural(policies.length, "política vigente", "políticas vigentes")}, ${plural(matrix.pendingTotal, "aceite pendente", "aceites pendentes")}`,
      beneficios: benefits
        .filter((b) => b.active)
        .map((b) => b.providerName)
        .join(", "),
      compliance: `Vídeo versão ${video.version}, quiz versão ${quiz.version} com ${plural(quiz.questions.length, "pergunta", "perguntas")}`,
      "base-de-conhecimento": `${plural(articles.length, "artigo", "artigos")}, ${plural(openGaps, "lacuna aberta", "lacunas abertas")}`,
      "quem-e-quem": `${plural(directory.length, "pessoa", "pessoas")}, ${plural(directory.filter((d) => d.toValidate).length, "a validar", "a validar")}`,
      pesquisa:
        average === undefined
          ? "Nenhuma resposta ainda"
          : `${plural(surveys.length, "resposta", "respostas")}, média ${(Math.round(average * 10) / 10).toLocaleString("pt-BR")}`,
      auditoria: plural(audit.length, "evento", "eventos"),
      demo: `Data virtual ${formatDate(ctx.clock.todayKey())}`,
    },
  };
}

function actionLabel(action: RuleAction, templates: Map<string, string>): string {
  switch (action.type) {
    case "send_email": {
      const name = templates.get(action.template) ?? action.template;
      const cc = action.cc?.length ? `, com cópia para ${action.cc.map((c) => RECIPIENT_LABELS[c]).join(" e ")}` : "";
      return `E-mail "${name}" para ${RECIPIENT_LABELS[action.to]}${cc}`;
    }
    case "create_task":
      return `Cria a tarefa "${taskTitle(action.taskId)}"`;
    case "unlock_task":
      return `Libera a tarefa "${taskTitle(action.taskId)}"`;
    case "record_evidence":
      return "Registra o comprovante de treinamento";
    case "require_reack":
      return "Cria re-aceite pendente para quem já tinha aceitado";
    case "reindex_assistant":
      return "Atualiza o índice do assistente";
  }
}

const ALL_TASKS = workflows.flatMap(allTasks);

function taskTitle(taskId: string): string {
  return ALL_TASKS.find((t) => t.id === taskId)?.title ?? taskId;
}

export interface RuleRow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  condition?: string;
  audience: string;
  actions: string[];
  enabled: boolean;
  firings: number;
  lastFiring?: { at: string; who?: string };
}

export async function automationsAdmin(ctx: DomainContext): Promise<RuleRow[]> {
  const [firings, templates, cases, people] = await Promise.all([
    ctx.repo.automations.listFirings(),
    ctx.repo.email.listTemplates(),
    ctx.repo.cases.list(),
    ctx.repo.people.list(),
  ]);
  const templateNames = new Map(templates.map((t) => [t.id, t.name]));
  const personOfCase = new Map(cases.map((c) => [c.id, people.find((p) => p.id === c.personId)?.name]));
  const rows: RuleRow[] = [];
  for (const rule of automationRules) {
    const mine = firings.filter((f) => f.ruleId === rule.id).sort((a, b) => b.firedAt.localeCompare(a.firedAt));
    const last = mine[0];
    rows.push({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      trigger: rule.on === "clock.tick" ? "Verificação diária" : eventLabel(rule.on),
      condition: rule.conditionLabel,
      audience: rule.audience,
      actions: rule.actions.map((a) => actionLabel(a, templateNames)),
      enabled: await isRuleEnabled(ctx, rule),
      firings: mine.length,
      lastFiring: last ? { at: last.firedAt, who: last.caseId ? personOfCase.get(last.caseId) : undefined } : undefined,
    });
  }
  return rows;
}

export async function policiesAdmin(ctx: DomainContext) {
  const [policies, matrix] = await Promise.all([currentPolicies(ctx), ackMatrix(ctx)]);
  const pendingOf = new Map(matrix.policies.map((p) => [p.id, p.pending]));
  return policies
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      effectiveFrom: p.effectiveFrom,
      publishedAt: p.publishedAt,
      summary: p.summary,
      bodyMd: p.bodyMd,
      changelog: p.changelog,
      requiresAck: p.requiresAck,
      isExample: p.isExample,
      pending: pendingOf.get(p.id) ?? 0,
    }));
}

export async function benefitsAdmin(ctx: DomainContext) {
  const plans = await ctx.repo.benefits.list();
  return plans.slice().sort((a, b) => Number(b.active) - Number(a.active) || b.validFrom.localeCompare(a.validFrom));
}

export async function complianceAdmin(ctx: DomainContext) {
  const [video, quiz, attempts] = await Promise.all([
    ctx.repo.training.getVideo(),
    ctx.repo.training.getQuiz(),
    ctx.repo.training.listQuizAttempts(),
  ]);
  const passed = attempts.filter((a) => a.passed).length;
  return {
    video,
    quiz,
    stats: {
      attempts: attempts.length,
      passed,
      firstTryPassRate: (() => {
        const firsts = new Map<string, boolean>();
        for (const a of attempts.slice().sort((x, y) => x.answeredAt.localeCompare(y.answeredAt))) {
          const key = a.caseId ?? a.personId;
          if (!firsts.has(key)) firsts.set(key, a.passed);
        }
        const values = [...firsts.values()];
        return values.length ? Math.round((values.filter(Boolean).length / values.length) * 100) : undefined;
      })(),
    },
  };
}

export async function knowledgeAdmin(ctx: DomainContext) {
  const [articles, gaps, people, directory] = await Promise.all([
    ctx.repo.knowledge.listArticles(),
    ctx.repo.assistant.listGaps(),
    ctx.repo.people.list(),
    ctx.repo.knowledge.listDirectory(),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const team = directory
    .map((d) => byId.get(d.personId))
    .filter((p): p is Person => !!p)
    .map((p) => ({ id: p.id, name: p.name }));
  // Quem responde por uma só categoria sugere essa categoria; senão, "Geral".
  const categoryOfPerson = (personId?: string): KbCategory => {
    const categories = directory.find((d) => d.personId === personId)?.categories ?? [];
    return categories.length === 1 ? categories[0]! : "geral";
  };
  return {
    articles: articles
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
      .map((a) => ({
        ...a,
        categoryLabel: KB_CATEGORY_LABELS[a.category],
        ownerName: a.ownerPersonId ? byId.get(a.ownerPersonId)?.name : undefined,
      })),
    gaps: gaps
      .slice()
      .sort((a, b) => Number(a.status === "resolvida") - Number(b.status === "resolvida") || b.askedAt.localeCompare(a.askedAt))
      .map((g) => ({
        ...g,
        askedByName: byId.get(g.askedById)?.name ?? g.askedById,
        routedToName: g.routedToId ? byId.get(g.routedToId)?.name : undefined,
        suggestedCategory: categoryOfPerson(g.routedToId),
        resolvedArticleTitle: g.resolvedArticleId ? articles.find((a) => a.id === g.resolvedArticleId)?.title : undefined,
      })),
    team,
  };
}

export async function directoryAdmin(ctx: DomainContext) {
  const [directory, people, cases] = await Promise.all([
    ctx.repo.knowledge.listDirectory(),
    ctx.repo.people.list(),
    ctx.repo.cases.list(),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const inOnboarding = new Set(cases.filter((c) => c.status !== "concluido").map((c) => c.personId));
  return {
    entries: directory.map((d) => ({ ...d, name: byId.get(d.personId)?.name ?? d.personId })),
    candidates: people
      .filter((p) => !directory.some((d) => d.personId === p.id) && !inOnboarding.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((p) => ({ id: p.id, name: p.name })),
  };
}

export async function surveyAdmin(ctx: DomainContext) {
  const [responses, people, cases] = await Promise.all([ctx.repo.surveys.list(), ctx.repo.people.list(), ctx.repo.cases.list()]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const scores = responses.map((r) => r.nps);
  return {
    responses: responses
      .slice()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((r) => {
        const c = caseById.get(r.caseId);
        const person = c ? byId.get(c.personId) : undefined;
        return { ...r, personName: person?.name ?? "Pessoa removida", regime: c?.regime, startDate: c?.startDate };
      }),
    average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : undefined,
    distribution: Array.from({ length: 11 }, (_, n) => scores.filter((s) => s === n).length),
  };
}

// ---------------------------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------------------------

export type AuditOrigin = "manual" | "automatico" | "sistema";

export interface AuditFilters {
  personId?: string;
  type?: string;
  origin?: AuditOrigin;
}

export interface AuditRow extends TimelineEntry {
  origin: AuditOrigin;
  personName?: string;
}

function originOf(e: AuditEvent): AuditOrigin {
  if (e.actorId === AUTOMATION_ACTOR) return "automatico";
  if (e.actorId === SYSTEM_ACTOR) return "sistema";
  return "manual";
}

export async function auditLog(ctx: DomainContext, filters: AuditFilters = {}) {
  const [events, people] = await Promise.all([ctx.repo.audit.list(), ctx.repo.people.list()]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const all = events.slice().sort((a, b) => b.at.localeCompare(a.at));
  const rows: AuditRow[] = all
    .filter((e) => !filters.personId || e.personId === filters.personId)
    .filter((e) => !filters.type || e.type === filters.type)
    .filter((e) => !filters.origin || originOf(e) === filters.origin)
    .map((e) => ({
      ...describeAudit(e, byId),
      origin: originOf(e),
      personName: e.personId ? byId.get(e.personId)?.name : undefined,
    }));
  const types = [...new Set(all.map((e) => e.type))]
    .map((type) => ({ type, label: eventLabel(type) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const personIds = new Set(all.map((e) => e.personId).filter((id): id is string => !!id));
  return {
    rows,
    total: all.length,
    types,
    people: [...personIds]
      .map((id) => ({ id, name: byId.get(id)?.name ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}

const ORIGIN_LABELS: Record<AuditOrigin, string> = { manual: "manual", automatico: "automático", sistema: "sistema" };

export function auditToCsv(rows: AuditRow[]): string {
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["data/hora (São Paulo)", "evento", "detalhe", "pessoa", "quem fez", "origem", "regra"];
  const lines = rows.map((r) =>
    [formatDateTime(r.at), r.title, r.detail ?? "", r.personName ?? "", r.actorName, ORIGIN_LABELS[r.origin], r.ruleId ?? ""]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}
