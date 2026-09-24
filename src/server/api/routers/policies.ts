import { z } from "zod";

import { DomainError } from "@/domain/context";
import { acknowledgePolicy } from "@/domain/services/onboarding";
import { ackMatrix, benefitCards, myPolicies, policyDetail } from "@/domain/services/policy-queries";
import { createTRPCRouter, sessionProcedure } from "@/server/api/trpc";

/** Políticas e benefícios (seção 9.5). */
export const policiesRouter = createTRPCRouter({
  overview: sessionProcedure.query(async ({ ctx }) => {
    const person = await ctx.domain.repo.people.get(ctx.session.id);
    const [policies, benefits, matrix] = await Promise.all([
      myPolicies(ctx.domain, ctx.session.id),
      benefitCards(ctx.domain, person),
      ctx.session.viewRole === "ADMIN_RH" ? ackMatrix(ctx.domain) : Promise.resolve(undefined),
    ]);
    return { policies, benefits, matrix };
  }),

  detail: sessionProcedure
    .input(z.object({ policyId: z.string().min(1), version: z.number().int().positive().optional() }))
    .query(({ ctx, input }) => policyDetail(ctx.domain, ctx.session.id, input.policyId, input.version)),

  acknowledge: sessionProcedure.input(z.object({ policyId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const detail = await policyDetail(ctx.domain, ctx.session.id, input.policyId);
    if (!detail.my.canAcknowledge) {
      throw new DomainError(detail.my.journey?.hint ?? "Não há aceite pendente nesta política.", "CONFLICT");
    }
    await acknowledgePolicy(ctx.domain, ctx.session.id, input.policyId, ctx.session.id);
    return { ok: true as const };
  }),
});
