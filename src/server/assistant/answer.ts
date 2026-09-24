import "server-only";

/**
 * Resposta do assistente (seção 10.2): mascara a pergunta, busca os trechos e responde pelo LLM
 * (com fallback local em erro ou timeout) ou pelo modo local; quando a base não cobre, encaminha
 * para a pessoa certa e registra a lacuna. Emite eventos que a rota /api/assistant serializa em
 * NDJSON. Nunca lê casos, fichas ou documentos (D-OB-06).
 */
import { company } from "@/config/company";
import type { DomainContext } from "@/domain/context";
import { runExclusive } from "@/domain/lock";
import { getLlmProvider, getLocalProvider } from "@/server/providers/llm";
import type { ChatMessage, LlmProvider } from "@/server/providers/llm/types";

import { KIND_LABELS, getAssistantIndex, personForCategory, type AssistantIndex, type KnowledgeDoc, type KnowledgeKind } from "./index";
import { chunkText } from "./local-answer";
import { HISTORY_LIMIT, NO_ANSWER, buildMessages, buildSystemPrompt } from "./prompt";
import { redactSensitive } from "./redact";
import { excerptFor, retrieve, sourceHits, type Retrieval } from "./retrieve";
import { normalizeText, queryTerms, smallTalkKind } from "./text";

export type AssistantMode = "llm" | "local";

export interface AssistantSource {
  id: string;
  title: string;
  kind: KnowledgeKind;
  kindLabel: string;
  isExample: boolean;
}

export interface AssistantRoute {
  personId: string;
  name: string;
  jobTitle?: string;
  topics: string[];
  channel: string;
  question: string;
}

export type AssistantEvent =
  | { type: "meta"; mode: AssistantMode; sources: AssistantSource[]; messageId: string; question: string }
  | { type: "delta"; text: string }
  | ({ type: "route" } & AssistantRoute)
  | { type: "done" }
  | { type: "error"; message: string };

export interface AnswerInput {
  question: string;
  history?: ChatMessage[];
  /** Quem pergunta (persona da sessão). */
  personId: string;
  signal?: AbortSignal;
}

export interface AnswerOptions {
  provider?: LlmProvider;
  fallback?: LlmProvider;
  timeoutMs?: number;
}

export const LLM_TIMEOUT_MS = 20_000;
export const MAX_QUESTION_LENGTH = 1000;

const HELP_REPLY =
  "Posso ajudar com dúvidas sobre onboarding, despesas e viagens, benefícios, equipamentos, acessos, rotina de trabalho e compliance. Conte um pouco mais sobre a sua dúvida ou escolha uma das perguntas sugeridas.";
const THANKS_REPLY = "Por nada. Se surgir outra dúvida, é só perguntar.";
export const ERROR_REPLY = "Não consegui responder agora. Tente de novo em instantes.";

export function toSource(doc: KnowledgeDoc): AssistantSource {
  return {
    id: doc.id,
    title: doc.title,
    kind: doc.kind,
    kindLabel: doc.kind === "politica" && doc.version ? `Política, versão ${doc.version}` : KIND_LABELS[doc.kind],
    isExample: doc.isExample,
  };
}

function* textDeltas(text: string): Generator<AssistantEvent> {
  for (const chunk of chunkText(text)) yield { type: "delta", text: chunk };
}

type StreamOutcome = "ok" | "no_answer" | "failed" | "aborted";

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason instanceof Error ? signal.reason : new Error("abortado"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason instanceof Error ? signal.reason : new Error("abortado"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Repassa o texto do provedor, segurando o começo até saber se é `[SEM_RESPOSTA]`
 * (seção 10.2, item 3). Timeout e erro viram "failed"; cancelamento do cliente, "aborted".
 */
async function* guardedStream(
  provider: LlmProvider,
  input: { system: string; messages: ChatMessage[] },
  options: { timeoutMs?: number; signal?: AbortSignal },
): AsyncGenerator<string, StreamOutcome> {
  const controller = new AbortController();
  const onClientAbort = () => controller.abort(new Error("cancelado"));
  options.signal?.addEventListener("abort", onClientAbort, { once: true });
  const timer = options.timeoutMs
    ? setTimeout(() => controller.abort(new Error("tempo esgotado")), options.timeoutMs)
    : undefined;
  let held = "";
  let released = false;
  try {
    const iterator = provider.streamChat({ ...input, signal: controller.signal })[Symbol.asyncIterator]();
    for (;;) {
      const step = await raceAbort(iterator.next(), controller.signal);
      if (step.done) break;
      const text = step.value.replace(NO_ANSWER, "");
      if (released) {
        if (text) yield text;
        continue;
      }
      held += step.value;
      const start = held.trimStart();
      if (start.startsWith(NO_ANSWER)) {
        void iterator.return?.();
        return "no_answer";
      }
      if (NO_ANSWER.startsWith(start)) continue;
      released = true;
      yield start;
    }
    if (!released) {
      const rest = held.trim();
      if (!rest || NO_ANSWER.startsWith(rest)) return "no_answer";
      yield rest;
    }
    return "ok";
  } catch {
    return options.signal?.aborted ? "aborted" : "failed";
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", onClientAbort);
    // Encerra a chamada ao provedor se ela ainda estiver aberta (por exemplo, após [SEM_RESPOSTA]).
    controller.abort(new Error("encerrado"));
  }
}

/** Para quem encaminhar: tema do "Quem é quem", categoria do melhor trecho ou contato padrão. */
export async function resolveRoute(
  ctx: DomainContext,
  index: AssistantIndex,
  retrieval: Retrieval,
  question: string,
): Promise<AssistantRoute> {
  const directory = index.directory;
  let personId: string | undefined;
  let bestTopicHits = 0;
  for (const entry of directory) {
    const words = queryTerms(entry.topics.join(" "));
    const count = retrieval.terms.filter((t) => words.some((w) => w.startsWith(t))).length;
    if (count > bestTopicHits) {
      bestTopicHits = count;
      personId = entry.personId;
    }
  }
  const top = retrieval.hits[0];
  personId ??= top && top.coverage >= 0.5 ? personForCategory(directory, top.doc.category) : company.defaultRoutingPersonId;
  const person = (await ctx.repo.people.get(personId)) ?? (await ctx.repo.people.get(company.defaultRoutingPersonId));
  const entry = directory.find((d) => d.personId === person?.id);
  return {
    personId: person?.id ?? company.defaultRoutingPersonId,
    name: person?.name ?? "RH",
    jobTitle: person?.jobTitle,
    topics: entry?.topics ?? [],
    channel: entry?.channel ?? company.defaultChannel,
    question,
  };
}

function sameQuestion(a: string, b: string): boolean {
  const norm = (s: string) => normalizeText(s).replace(/[^a-z0-9]+/g, " ").trim();
  return norm(a) === norm(b);
}

/**
 * Registra a lacuna (uma por pergunta em aberto). Roda fora do tRPC (rota de streaming), por isso
 * pega a exclusão mútua só para a escrita; não chamar de dentro de uma mutação tRPC.
 */
export async function registerGap(
  ctx: DomainContext,
  input: { question: string; askedById: string; routedToId: string },
): Promise<void> {
  await runExclusive(async () => {
    const open = (await ctx.repo.assistant.listGaps()).filter((g) => g.status === "aberta");
    if (open.some((g) => sameQuestion(g.question, input.question))) return;
    await ctx.repo.assistant.insertGap({
      id: ctx.repo.newId("gap"),
      question: input.question,
      askedById: input.askedById,
      askedAt: ctx.clock.nowIso(),
      status: "aberta",
      routedToId: input.routedToId,
    });
  });
}

async function* routeAnswer(
  ctx: DomainContext,
  index: AssistantIndex,
  retrieval: Retrieval,
  info: { question: string; personId: string; messageId: string },
): AsyncGenerator<AssistantEvent> {
  const route = await resolveRoute(ctx, index, retrieval, info.question);
  await registerGap(ctx, { question: info.question, askedById: info.personId, routedToId: route.personId });
  yield { type: "meta", mode: "local", sources: [], messageId: info.messageId, question: info.question };
  yield* textDeltas(
    `Ainda não tenho essa resposta na base de conhecimento. Fale com ${route.name} pelo ${route.channel}. A pergunta ficou registrada para a base ser completada.`,
  );
  yield { type: "route", ...route };
  yield { type: "done" };
}

export async function* answerQuestion(
  ctx: DomainContext,
  input: AnswerInput,
  options: AnswerOptions = {},
): AsyncGenerator<AssistantEvent> {
  const messageId = ctx.repo.newId("msg");
  const question = redactSensitive(input.question).replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_LENGTH);
  const history: ChatMessage[] = (input.history ?? [])
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: redactSensitive(m.content).slice(0, 2000) }));

  const small = smallTalkKind(question);
  if (small) {
    yield { type: "meta", mode: "local", sources: [], messageId, question };
    yield* textDeltas(small === "agradecimento" ? THANKS_REPLY : HELP_REPLY);
    yield { type: "done" };
    return;
  }

  const index = await getAssistantIndex(ctx);
  const retrieval = retrieve(index, question);
  const info = { question, personId: input.personId, messageId };
  if (!retrieval.confident) {
    yield* routeAnswer(ctx, index, retrieval, info);
    return;
  }

  const sources = sourceHits(retrieval).map((h) => toSource(h.doc));
  const system = buildSystemPrompt(
    retrieval.hits.map((h) => ({
      id: h.doc.id,
      title: h.doc.title,
      responsible: index.people.get(personForCategory(index.directory, h.doc.category))?.name,
      text: excerptFor(h.doc, retrieval.terms),
    })),
  );
  const messages = buildMessages(history, question);

  const provider = options.provider ?? getLlmProvider();
  let mode: AssistantMode = provider.name === "local" ? "local" : "llm";
  yield { type: "meta", mode, sources, messageId, question };

  const forward = async function* (p: LlmProvider, timeoutMs?: number): AsyncGenerator<AssistantEvent, StreamOutcome> {
    const stream = guardedStream(p, { system, messages }, { timeoutMs, signal: input.signal });
    for (;;) {
      const step = await stream.next();
      if (step.done) return step.value;
      yield { type: "delta", text: step.value };
    }
  };

  let outcome = yield* forward(provider, mode === "llm" ? (options.timeoutMs ?? LLM_TIMEOUT_MS) : undefined);
  if (outcome === "aborted") return;
  if (outcome === "failed" && mode === "llm") {
    // Erro ou timeout do LLM: a mesma pergunta, em modo local. O novo "meta" limpa o texto parcial.
    mode = "local";
    yield { type: "meta", mode, sources, messageId, question };
    outcome = yield* forward(options.fallback ?? getLocalProvider());
    if (outcome === "aborted") return;
  }
  if (outcome === "no_answer") {
    yield* routeAnswer(ctx, index, retrieval, info);
    return;
  }
  if (outcome === "failed") {
    yield { type: "error", message: ERROR_REPLY };
    return;
  }
  yield { type: "done" };
}
