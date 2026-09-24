import { z } from "zod";

import {
  ChangeBenefitInputSchema,
  PublishPolicyInputSchema,
  SaveArticleInputSchema,
  SaveDirectoryInputSchema,
  UpdateQuizInputSchema,
  UpdateVideoInputSchema,
} from "@/domain/inputs";
import {
  adminOverview,
  auditLog,
  automationsAdmin,
  benefitsAdmin,
  complianceAdmin,
  directoryAdmin,
  knowledgeAdmin,
  outbox,
  policiesAdmin,
  surveyAdmin,
} from "@/domain/services/admin-queries";
import {
  changeBenefitProvider,
  publishPolicyVersion,
  saveArticle,
  saveDirectoryEntry,
  setRuleEnabled,
  updateQuiz,
  updateVideo,
} from "@/domain/services/content";
import { createTRPCRouter, rhProcedure } from "@/server/api/trpc";

/** Admin (seção 9.10): só RH. Na Fase 0, tudo em memória. */
export const adminRouter = createTRPCRouter({
  overview: rhProcedure.query(({ ctx }) => adminOverview(ctx.domain)),
  outbox: rhProcedure.query(({ ctx }) => outbox(ctx.domain)),

  automations: rhProcedure.query(({ ctx }) => automationsAdmin(ctx.domain)),
  setRuleEnabled: rhProcedure
    .input(z.object({ ruleId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setRuleEnabled(ctx.domain, input.ruleId, input.enabled, ctx.session.id);
      return { ok: true as const };
    }),

  policies: rhProcedure.query(({ ctx }) => policiesAdmin(ctx.domain)),
  publishPolicy: rhProcedure
    .input(PublishPolicyInputSchema.extend({ isExample: z.boolean().optional() }))
    .mutation(({ ctx, input }) => publishPolicyVersion(ctx.domain, input, ctx.session.id)),

  benefits: rhProcedure.query(({ ctx }) => benefitsAdmin(ctx.domain)),
  changeBenefit: rhProcedure
    .input(ChangeBenefitInputSchema.extend({ isExample: z.boolean().optional() }))
    .mutation(({ ctx, input }) => changeBenefitProvider(ctx.domain, input, ctx.session.id)),

  compliance: rhProcedure.query(({ ctx }) => complianceAdmin(ctx.domain)),
  saveVideo: rhProcedure
    .input(UpdateVideoInputSchema)
    .mutation(({ ctx, input }) => updateVideo(ctx.domain, input, ctx.session.id)),
  saveQuiz: rhProcedure
    .input(UpdateQuizInputSchema)
    .mutation(({ ctx, input }) => updateQuiz(ctx.domain, input, ctx.session.id)),

  knowledge: rhProcedure.query(({ ctx }) => knowledgeAdmin(ctx.domain)),
  saveArticle: rhProcedure
    .input(SaveArticleInputSchema)
    .mutation(({ ctx, input }) => saveArticle(ctx.domain, input, ctx.session.id)),

  directory: rhProcedure.query(({ ctx }) => directoryAdmin(ctx.domain)),
  saveDirectory: rhProcedure.input(SaveDirectoryInputSchema).mutation(async ({ ctx, input }) => {
    await saveDirectoryEntry(ctx.domain, input, ctx.session.id);
    return { ok: true as const };
  }),

  survey: rhProcedure.query(({ ctx }) => surveyAdmin(ctx.domain)),

  audit: rhProcedure
    .input(
      z.object({
        personId: z.string().optional(),
        type: z.string().optional(),
        origin: z.enum(["manual", "automatico", "sistema"]).optional(),
      }),
    )
    .query(({ ctx, input }) => auditLog(ctx.domain, input)),
});
