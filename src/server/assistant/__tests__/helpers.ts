import type { AnswerOptions, AssistantEvent } from "@/server/assistant/answer";
import { LocalProvider } from "@/server/providers/llm/local-provider";
import type { ChatMessage, LlmProvider } from "@/server/providers/llm/types";

export const localNow = (): AnswerOptions => ({
  provider: new LocalProvider({ chunkDelayMs: 0 }),
  fallback: new LocalProvider({ chunkDelayMs: 0 }),
});

export async function collect(events: AsyncIterable<AssistantEvent>): Promise<AssistantEvent[]> {
  const out: AssistantEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
}

/** Texto final da resposta (depois do último `meta`, que reinicia o texto). */
export function answerText(events: AssistantEvent[]): string {
  const lastMeta = events.map((e) => e.type).lastIndexOf("meta");
  return events
    .slice(lastMeta + 1)
    .filter((e): e is Extract<AssistantEvent, { type: "delta" }> => e.type === "delta")
    .map((e) => e.text)
    .join("");
}

export function lastMeta(events: AssistantEvent[]) {
  return events.filter((e): e is Extract<AssistantEvent, { type: "meta" }> => e.type === "meta").at(-1);
}

export function routeOf(events: AssistantEvent[]) {
  return events.find((e): e is Extract<AssistantEvent, { type: "route" }> => e.type === "route");
}

/** Provedor de LLM falso: devolve os pedaços dados e guarda o que recebeu. */
export class FakeLlm implements LlmProvider {
  readonly name = "fake-llm";
  calls: { system: string; messages: ChatMessage[] }[] = [];

  constructor(private readonly behavior: { chunks?: string[]; fail?: boolean; hang?: boolean }) {}

  async *streamChat(input: { system: string; messages: ChatMessage[]; signal?: AbortSignal }): AsyncIterable<string> {
    this.calls.push({ system: input.system, messages: input.messages });
    if (this.behavior.fail) throw new Error("falha simulada do provedor");
    if (this.behavior.hang) {
      await new Promise<void>((_, reject) => {
        input.signal?.addEventListener("abort", () => reject(new Error("abortado")), { once: true });
      });
    }
    for (const chunk of this.behavior.chunks ?? []) yield chunk;
  }
}
