/** Provedor de LLM (seção 10.4). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  readonly name: string;
  streamChat(input: { system: string; messages: ChatMessage[]; signal?: AbortSignal }): AsyncIterable<string>;
}
