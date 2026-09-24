import { TRPCError } from "@trpc/server";

import { advanceDay, resetDemo } from "@/domain/services/demo";
import { createTRPCRouter, sessionProcedure } from "@/server/api/trpc";
import { isDemoMode } from "@/server/env";

function requireDemo() {
  if (!isDemoMode()) throw new TRPCError({ code: "NOT_FOUND", message: "Modo demo desligado." });
}

/** Controles do painel Demo (seção 5). Com DEMO_MODE=false, respondem 404. */
export const demoRouter = createTRPCRouter({
  state: sessionProcedure.query(async ({ ctx }) => {
    requireDemo();
    return {
      today: ctx.domain.clock.todayKey(),
      offsetDays: await ctx.domain.repo.getClockOffset(),
    };
  }),
  advanceDay: sessionProcedure.mutation(async ({ ctx }) => {
    requireDemo();
    const today = await advanceDay(ctx.domain, ctx.session.id);
    return { today };
  }),
  reset: sessionProcedure.mutation(async ({ ctx }) => {
    requireDemo();
    await resetDemo(ctx.domain, ctx.session.id);
    return { ok: true as const };
  }),
});
