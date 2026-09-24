/** Leituras do Admin (seção 9.10). */
import { automationRules } from "@/config/automations";

import type { DomainContext } from "../context";

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
