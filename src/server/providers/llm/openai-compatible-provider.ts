import "server-only";

/**
 * Provedor compatível com a API da OpenAI (DeepSeek, Gemini ou outro), configurado por
 * LLM_BASE_URL, LLM_API_KEY e LLM_MODEL (Apêndice B). Streaming pelo SDK `openai`.
 */
import OpenAI from "openai";

import type { ChatMessage, LlmProvider } from "./types";

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAICompatibleProvider implements LlmProvider {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.name = `openai-compatible:${config.model}`;
    this.client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey, maxRetries: 0, timeout: 20_000 });
  }

  async *streamChat(input: { system: string; messages: ChatMessage[]; signal?: AbortSignal }): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.config.model,
        stream: true,
        temperature: 0.2,
        max_tokens: 700,
        messages: [{ role: "system", content: input.system }, ...input.messages],
      },
      { signal: input.signal },
    );
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
}
