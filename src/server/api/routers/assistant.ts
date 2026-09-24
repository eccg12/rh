import { z } from "zod";

import { createTRPCRouter, sessionProcedure } from "@/server/api/trpc";
import { assistantOverview, assistantSource, recordAssistantFeedback } from "@/server/assistant/queries";

/** Assistente: dados da página e do painel de fontes, e avaliação das respostas. A conversa em si
 * passa pela rota de streaming /api/assistant. */
export const assistantRouter = createTRPCRouter({
  overview: sessionProcedure.query(({ ctx }) => assistantOverview(ctx.domain, ctx.session.viewRole)),

  source: sessionProcedure
    .input(z.object({ id: z.string().min(1).max(200) }))
    .query(({ ctx, input }) => assistantSource(ctx.domain, input.id)),

  feedback: sessionProcedure
    .input(
      z.object({
        messageId: z.string().min(1).max(64),
        helpful: z.boolean(),
        question: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await recordAssistantFeedback(ctx.domain, input, ctx.session.id);
      return { ok: true as const };
    }),
});
