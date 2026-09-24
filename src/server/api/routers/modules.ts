import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { SaveTimesheetInputSchema } from "@/domain/inputs";
import { DateOnlySchema } from "@/domain/schemas";
import { expensesOverview, routineOverview } from "@/domain/services/module-queries";
import { saveTimesheet, teamWeek, timesheetWeek } from "@/domain/services/timesheets";
import { createTRPCRouter, managerProcedure, sessionProcedure } from "@/server/api/trpc";

/** Quem aponta horas: colaboradores e RH. New joiners só leem a rotina (seção 4). */
const timesheetProcedure = sessionProcedure.use(({ ctx, next }) => {
  if (ctx.session.viewRole === "NEW_JOINER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "O apontamento começa depois do onboarding." });
  }
  return next();
});

/** Despesas e viagens (seção 9.7). */
export const expensesRouter = createTRPCRouter({
  overview: sessionProcedure.query(({ ctx }) => expensesOverview(ctx.domain, ctx.session.id)),
});

/** Rotina e apontamento (seção 9.8). */
export const routineRouter = createTRPCRouter({
  overview: sessionProcedure.query(({ ctx }) => routineOverview(ctx.domain, ctx.session.id)),

  week: timesheetProcedure
    .input(z.object({ weekStart: DateOnlySchema.optional() }))
    .query(({ ctx, input }) => timesheetWeek(ctx.domain, ctx.session.id, input.weekStart)),

  save: timesheetProcedure
    .input(SaveTimesheetInputSchema)
    .mutation(({ ctx, input }) => saveTimesheet(ctx.domain, ctx.session.id, input, ctx.session.id)),

  team: managerProcedure
    .input(z.object({ weekStart: DateOnlySchema.optional() }))
    .query(({ ctx, input }) => teamWeek(ctx.domain, input.weekStart)),
});
