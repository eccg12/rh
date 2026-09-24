import { company } from "@/config/company";
import { createTRPCRouter, sessionProcedure } from "@/server/api/trpc";
import { isDemoMode } from "@/server/env";
import { listPersonas } from "@/server/session";

export const sessionRouter = createTRPCRouter({
  me: sessionProcedure.query(({ ctx }) => ({
    session: ctx.session,
    demoMode: isDemoMode(),
    today: ctx.domain.clock.todayKey(),
    productName: company.productName,
  })),
  personas: sessionProcedure.query(({ ctx }) => listPersonas(ctx.domain)),
});
