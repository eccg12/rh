import "server-only";

/** Escolhe o provedor pela presença de LLM_API_KEY (seção 10.4). */
import { llmConfig } from "@/server/env";

import { LocalProvider } from "./local-provider";
import { OpenAICompatibleProvider } from "./openai-compatible-provider";
import type { LlmProvider } from "./types";

let cached: { key: string; provider: LlmProvider } | undefined;
const local = new LocalProvider();

export function getLlmProvider(): LlmProvider {
  const config = llmConfig();
  const key = config.apiKey ? `${config.baseUrl}|${config.model}|${config.apiKey}` : "local";
  if (cached?.key !== key) {
    cached = {
      key,
      provider: config.apiKey
        ? new OpenAICompatibleProvider({ baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model })
        : local,
    };
  }
  return cached.provider;
}

/** Usado quando o LLM falha ou demora (seção 10.2, item 3). */
export function getLocalProvider(): LlmProvider {
  return local;
}
