/**
 * Conversa com o assistente em streaming NDJSON (seção 10.2, item 6): uma linha JSON por evento
 * (`meta`, `delta`, `route`, `done` ou `error`). Não lê casos, fichas nem documentos (D-OB-06).
 */
import { z } from "zod";

import { company } from "@/config/company";
import { answerQuestion, ERROR_REPLY, MAX_QUESTION_LENGTH, type AssistantEvent } from "@/server/assistant/answer";
import { takeRateLimit } from "@/server/assistant/rate-limit";
import { getDomain } from "@/server/domain";
import { isDemoMode } from "@/server/env";
import { personaFromCookieHeader } from "@/server/session";

const BodySchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH * 2),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(50)
    .default([]),
});

const HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

function line(event: AssistantEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function single(event: AssistantEvent, status: number, extra: Record<string, string> = {}): Response {
  return new Response(line(event), { status, headers: { ...HEADERS, ...extra } });
}

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return single({ type: "error", message: "Escreva uma pergunta para o assistente." }, 400);

  const ctx = await getDomain();
  const personaId = isDemoMode() ? personaFromCookieHeader(request.headers.get("cookie")) : undefined;
  const personId = personaId && (await ctx.repo.people.get(personaId)) ? personaId : company.rhContactPersonId;

  const limit = takeRateLimit(personId);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60));
    return single(
      {
        type: "error",
        message: `Você fez muitas perguntas em pouco tempo. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
      },
      429,
      { "Retry-After": String(limit.retryAfterSec) },
    );
  }

  const encoder = new TextEncoder();
  const events = answerQuestion(ctx, {
    question: parsed.data.question,
    history: parsed.data.history,
    personId,
    signal: request.signal,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => {
        try {
          controller.enqueue(encoder.encode(line(event)));
          return true;
        } catch {
          return false; // cliente saiu
        }
      };
      try {
        for await (const event of events) {
          if (!send(event)) break;
        }
      } catch (error) {
        console.error("[assistente]", error);
        send({ type: "error", message: ERROR_REPLY });
      } finally {
        try {
          controller.close();
        } catch {
          // já fechado
        }
      }
    },
    async cancel() {
      await events.return(undefined);
    },
  });

  return new Response(stream, { headers: HEADERS });
}
