import "server-only";

/** Leituras e comandos do assistente usados pelas telas (página, widget e painel de fontes). */
import { KB_CATEGORY_LABELS, KB_CATEGORY_ORDER } from "@/config/knowledge";
import type { DomainContext } from "@/domain/context";
import { DomainError } from "@/domain/context";
import type { KbCategory, ViewRole } from "@/domain/schemas";

import { toSource, type AssistantSource } from "./answer";
import { getAssistantIndex, type KnowledgeKind } from "./index";
import { redactSensitive } from "./redact";

export interface DirectoryCard {
  personId: string;
  name: string;
  jobTitle?: string;
  topics: string[];
  channel: string;
  toValidate: boolean;
}

export interface AssistantOverview {
  directory: DirectoryCard[];
  categories: { id: KbCategory; label: string; sources: AssistantSource[] }[];
  /** Só para o RH: lacunas em aberto. */
  openGaps?: number;
}

export async function assistantOverview(ctx: DomainContext, viewRole: ViewRole): Promise<AssistantOverview> {
  const [index, gaps] = await Promise.all([getAssistantIndex(ctx), ctx.repo.assistant.listGaps()]);
  const docs = [...index.docs.values()].filter((d) => d.kind !== "quem_e_quem");
  return {
    directory: index.directory
      .map<DirectoryCard | null>((entry) => {
        const person = index.people.get(entry.personId);
        if (!person) return null;
        return {
          personId: person.id,
          name: person.name,
          jobTitle: person.jobTitle,
          topics: entry.topics,
          channel: entry.channel,
          toValidate: entry.toValidate,
        };
      })
      .filter((c): c is DirectoryCard => !!c),
    categories: KB_CATEGORY_ORDER.map((id) => ({
      id,
      label: KB_CATEGORY_LABELS[id],
      sources: docs
        .filter((d) => d.category === id)
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
        .map(toSource),
    })).filter((c) => c.sources.length > 0),
    openGaps: viewRole === "ADMIN_RH" ? gaps.filter((g) => g.status === "aberta").length : undefined,
  };
}

export interface SourceDetail extends AssistantSource {
  kind: KnowledgeKind;
  summary: string;
  bodyMd: string;
  categoryLabel: string;
  updatedAt?: string;
  href?: string;
  ownerName?: string;
}

export async function assistantSource(ctx: DomainContext, id: string): Promise<SourceDetail> {
  const index = await getAssistantIndex(ctx);
  const doc = index.docs.get(id);
  if (!doc) throw new DomainError("Esta fonte não está mais na base.", "NOT_FOUND");
  const owner = doc.ownerPersonId ? await ctx.repo.people.get(doc.ownerPersonId) : undefined;
  return {
    ...toSource(doc),
    summary: doc.summary,
    bodyMd: doc.bodyMd,
    categoryLabel: KB_CATEGORY_LABELS[doc.category],
    updatedAt: doc.updatedAt,
    href: doc.href,
    ownerName: owner?.name,
  };
}

/** "Ajudou" / "Não ajudou". Chamado por mutação tRPC, que já roda com exclusão mútua. */
export async function recordAssistantFeedback(
  ctx: DomainContext,
  input: { messageId: string; helpful: boolean; question?: string },
  personId: string,
): Promise<void> {
  const existing = (await ctx.repo.assistant.listFeedback()).find(
    (f) => f.messageId === input.messageId && f.personId === personId,
  );
  if (existing) throw new DomainError("Você já avaliou esta resposta.", "CONFLICT");
  await ctx.repo.assistant.insertFeedback({
    id: ctx.repo.newId("fb"),
    messageId: input.messageId,
    helpful: input.helpful,
    at: ctx.clock.nowIso(),
    question: input.question ? redactSensitive(input.question).slice(0, 1000) : undefined,
    personId,
  });
}
