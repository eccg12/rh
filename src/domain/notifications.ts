/**
 * E-mails da plataforma: modelos de content/emails (seção 8.4) renderizados num layout com a marca
 * e enviados pelo EmailProvider. Toda mensagem automática vira `email.sent` na auditoria.
 */
import { marked } from "marked";

import { brand } from "@/config/brand";
import { company } from "@/config/company";

import type { DomainContext } from "./context";
import { DomainError } from "./context";
import type { OnboardingCase, Owner, Person } from "./schemas";
import { AUTOMATION_ACTOR } from "./schemas";

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/** Link para o portal. No modo demo, o link troca a persona para o destinatário (seção 5). */
export function portalLink(ctx: DomainContext, personId: string, path: string): string {
  if (ctx.demoMode) {
    const params = new URLSearchParams({ persona: personId, next: path });
    return `${ctx.appUrl}/entrar?${params.toString()}`;
  }
  return `${ctx.appUrl}${path}`;
}

export function stagePath(stageId: string): string {
  return `/onboarding/etapa/${stageId}`;
}

export function casePath(caseId: string): string {
  return `/onboarding/casos/${caseId}`;
}

// ---------------------------------------------------------------------------------------------
// Destinatários
// ---------------------------------------------------------------------------------------------

export function emailOf(person: Person): string {
  return person.corporateEmail ?? person.personalEmail;
}

/** E-mail usado com quem ainda está entrando: o pessoal (a conta corporativa pode não existir). */
export function joinerEmail(person: Person): string {
  return person.personalEmail;
}

export async function personById(ctx: DomainContext, id: string | undefined): Promise<Person | undefined> {
  return id ? ctx.repo.people.get(id) : undefined;
}

export async function rhContact(ctx: DomainContext): Promise<Person> {
  const p = await ctx.repo.people.get(company.rhContactPersonId);
  if (!p) throw new DomainError("Contato de RH não configurado.", "NOT_FOUND");
  return p;
}

export async function ownerPerson(
  ctx: DomainContext,
  owner: Owner,
  c: OnboardingCase,
  joiner: Person,
): Promise<Person | undefined> {
  switch (owner) {
    case "new_joiner":
      return joiner;
    case "rh":
      return ctx.repo.people.get(company.rhContactPersonId);
    case "ti":
      return ctx.repo.people.get(company.tiContactPersonId);
    case "gestor":
      return joiner.managerId ? ctx.repo.people.get(joiner.managerId) : ctx.repo.people.get(company.rhContactPersonId);
  }
  void c;
}

// ---------------------------------------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------------------------------------

export type EmailVars = Record<string, string>;

/** Variáveis com Markdown montado pela própria plataforma (listas); as demais são escapadas. */
const RAW_VARS = new Set(["tarefas", "agenda", "sistemas"]);

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fill(text: string, vars: EmailVars, raw: boolean): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key] ?? "";
    return raw && RAW_VARS.has(key) ? value : escapeHtml(value);
  });
}

function decorate(html: string): string {
  const ink = brand.colors.ink;
  // Link sozinho no parágrafo vira botão.
  let out = html.replace(
    /<p><a href="([^"]+)">([^<]+)<\/a><\/p>/g,
    `<p style="margin:20px 0"><a href="$1" style="display:inline-block;background:${ink};color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;font-weight:600">$2</a></p>`,
  );
  out = out.replace(/<a href="([^"]+)">/g, `<a href="$1" style="color:${ink};text-decoration:underline">`);
  out = out.replace(/<p>/g, '<p style="margin:0 0 14px">');
  out = out.replace(/<ul>/g, '<ul style="margin:0 0 14px;padding-left:20px">');
  out = out.replace(/<ol>/g, '<ol style="margin:0 0 14px;padding-left:20px">');
  return out;
}

export function emailLayout(bodyHtml: string): string {
  const c = brand.colors;
  return [
    `<div style="font-family:${brand.fontFamily};background:${c.paper};padding:24px 12px;color:${c.ink}">`,
    `<div style="max-width:560px;margin:0 auto;background:${c.surface};border:1px solid ${c.rule};border-radius:8px">`,
    `<div style="padding:16px 24px;border-bottom:1px solid ${c.rule};font-weight:600;font-size:15px">`,
    `<span style="display:inline-block;width:12px;height:12px;background:${c.ink};border-radius:2px;margin-right:8px;vertical-align:-1px"></span>monoda</div>`,
    `<div style="padding:24px;font-size:15px;line-height:1.6">${bodyHtml}</div>`,
    `<div style="padding:14px 24px;border-top:1px solid ${c.rule};font-size:12px;color:${c.inkSoft}">`,
    `Enviado automaticamente pela plataforma ${company.productName}.</div>`,
    `</div></div>`,
  ].join("");
}

export async function renderTemplate(
  ctx: DomainContext,
  templateId: string,
  vars: EmailVars,
): Promise<{ subject: string; html: string }> {
  const templates = await ctx.repo.email.listTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (!template) throw new DomainError(`Modelo de e-mail não encontrado: ${templateId}`, "NOT_FOUND");
  const subject = fill(template.subject, vars, false).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const markdown = fill(template.bodyMd, vars, true);
  const body = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
  return { subject, html: emailLayout(decorate(body)) };
}

export interface SendEmailInput {
  templateId: string;
  to: Person;
  /** Endereço a usar (padrão: corporativo, ou pessoal se não houver). */
  address?: string;
  cc?: Person[];
  vars: EmailVars;
  caseId?: string;
  ruleId?: string;
}

/** Renderiza, envia e registra `email.sent` (ação automática). */
export async function sendTemplateEmail(ctx: DomainContext, input: SendEmailInput): Promise<string> {
  const { subject, html } = await renderTemplate(ctx, input.templateId, input.vars);
  const to = input.address ?? emailOf(input.to);
  const cc = input.cc?.map(emailOf);
  const { id } = await ctx.email.send({
    to,
    toName: input.to.name,
    toPersonId: input.to.id,
    cc,
    subject,
    html,
    templateId: input.templateId,
    caseId: input.caseId,
    ruleId: input.ruleId,
  });
  await ctx.repo.audit.insert({
    id: ctx.repo.newId("evt"),
    type: "email.sent",
    caseId: input.caseId,
    personId: input.to.id,
    actorId: AUTOMATION_ACTOR,
    ruleId: input.ruleId,
    at: ctx.clock.nowIso(),
    payload: { outboxId: id, to, toName: input.to.name, subject, templateId: input.templateId, cc },
  });
  return id;
}
