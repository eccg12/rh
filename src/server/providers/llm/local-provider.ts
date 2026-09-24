/**
 * Provedor local (sem chave de LLM): responde com o próprio trecho da base, sem gerar texto novo,
 * em pedaços para manter a sensação de streaming (seção 10.2, item 4).
 */
import { chunkText, composeLocalAnswer } from "@/server/assistant/local-answer";
import { NO_ANSWER, parseContext } from "@/server/assistant/prompt";
import { queryTerms } from "@/server/assistant/text";

import type { ChatMessage, LlmProvider } from "./types";

export class LocalProvider implements LlmProvider {
  readonly name = "local";

  constructor(private readonly options: { chunkDelayMs?: number } = {}) {}

  async *streamChat(input: { system: string; messages: ChatMessage[]; signal?: AbortSignal }): AsyncIterable<string> {
    const [best] = parseContext(input.system);
    const question = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const isPolicy = best?.id.startsWith("politica:") ?? false;
    const text = best
      ? composeLocalAnswer(best.text, queryTerms(question), { preferFirst: !isPolicy, sectionBound: isPolicy })
      : "";
    if (!text) {
      yield NO_ANSWER;
      return;
    }
    const delay = this.options.chunkDelayMs ?? 16;
    for (const chunk of chunkText(text)) {
      if (input.signal?.aborted) return;
      yield chunk;
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
