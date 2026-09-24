import "server-only";

/** Limite simples em memória: 30 perguntas a cada 10 minutos por sessão (seção 10.2, item 7). */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 10 * 60_000;

const g = globalThis as unknown as { __monodaAssistantRate?: Map<string, number[]> };

export function takeRateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const store = (g.__monodaAssistantRate ??= new Map<string, number[]>());
  const recent = (store.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    store.set(key, recent);
    return { allowed: false, retryAfterSec: Math.ceil((RATE_WINDOW_MS - (now - recent[0]!)) / 1000) };
  }
  recent.push(now);
  store.set(key, recent);
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(): void {
  g.__monodaAssistantRate?.clear();
}
