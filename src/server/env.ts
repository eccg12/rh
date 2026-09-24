import "server-only";

/**
 * Variáveis de ambiente — todas opcionais na Fase 0 (Apêndice B do plano).
 * Lidas em tempo de execução, nunca congeladas no build (D-OB-13).
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

/** Modo demonstração: padrão `true` na Fase 0. */
export function isDemoMode(): boolean {
  return (read("DEMO_MODE") ?? "true").toLowerCase() !== "false";
}

/** URL base usada nos links dos e-mails simulados. */
export function appUrl(): string {
  return (read("APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function llmConfig(): { baseUrl: string; apiKey?: string; model: string } {
  return {
    baseUrl: read("LLM_BASE_URL") ?? "https://api.deepseek.com",
    apiKey: read("LLM_API_KEY"),
    model: read("LLM_MODEL") ?? "deepseek-chat",
  };
}

export function demoPassword(): string | undefined {
  return read("DEMO_PASSWORD");
}
