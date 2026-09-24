import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  CorporateEmailInputSchema,
  CreateCaseInputSchema,
  FeedbackInputSchema,
  FileMetaSchema,
  ReviewDocumentInputSchema,
  ScheduleExamInputSchema,
  SendContractInputSchema,
} from "@/domain/inputs";
import { sampleFormValues } from "@/domain/samples";
import { StageIdSchema } from "@/domain/schemas";
import { caseDetail, journey, stageData } from "@/domain/services/case-queries";
import {
  acceptEquipmentTerm,
  acknowledgePolicy,
  assignEquipment,
  checkIn,
  confirmBenefits,
  createCase,
  declineContract,
  grantAccess,
  grantExtraQuizAttempt,
  markAccountingSent,
  markWelcomeSeen,
  readAgenda,
  revealSensitive,
  reviewDocument,
  saveFormDraft,
  scheduleExam,
  sendContract,
  setCorporateEmail,
  signContract,
  simulateAllDocuments,
  submitDocument,
  submitFeedback,
  submitForm,
  submitQuiz,
  watchVideo,
} from "@/domain/services/onboarding";
import { onboardingOverview } from "@/domain/services/onboarding-queries";
import { maskEmailShort } from "@/lib/format";
import { createTRPCRouter, joinerProcedure, rhProcedure } from "@/server/api/trpc";
import { isDemoMode } from "@/server/env";

const CaseIdInput = z.object({ caseId: z.string() });
const ValuesInput = z.object({ values: z.record(z.string(), z.unknown()) });

function requireDemo() {
  if (!isDemoMode()) throw new TRPCError({ code: "NOT_FOUND", message: "Atalho disponível só no modo demo." });
}

export const onboardingRouter = createTRPCRouter({
  // -------------------------------------------------------------------------------- RH
  overview: rhProcedure.query(({ ctx }) => onboardingOverview(ctx.domain)),

  formOptions: rhProcedure.query(async ({ ctx }) => {
    const [people, projects, templates] = await Promise.all([
      ctx.domain.repo.people.list(),
      ctx.domain.repo.projects.list(),
      ctx.domain.repo.contracts.listTemplates(),
    ]);
    return {
      today: ctx.domain.clock.todayKey(),
      managers: people.filter((p) => p.roles.includes("GESTOR")).map((p) => ({ id: p.id, name: p.name })),
      projects,
      templates,
    };
  }),

  create: rhProcedure.input(CreateCaseInputSchema).mutation(async ({ ctx, input }) => {
    const result = await createCase(ctx.domain, input, ctx.session.id);
    return { ...result, maskedEmail: maskEmailShort(result.welcomeSentTo) };
  }),

  caseDetail: rhProcedure.input(CaseIdInput).query(({ ctx, input }) => caseDetail(ctx.domain, input.caseId)),

  reviewDocument: rhProcedure
    .input(ReviewDocumentInputSchema)
    .mutation(({ ctx, input }) => reviewDocument(ctx.domain, input.documentId, input.decision, input.reason, ctx.session.id)),

  sendContract: rhProcedure.input(SendContractInputSchema).mutation(({ ctx, input }) => sendContract(ctx.domain, input, ctx.session.id)),

  setCorporateEmail: rhProcedure
    .input(CorporateEmailInputSchema)
    .mutation(({ ctx, input }) => setCorporateEmail(ctx.domain, input.caseId, input.email, ctx.session.id)),

  assignNotebook: rhProcedure
    .input(z.object({ caseId: z.string(), equipmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.domain.repo.cases.get(input.caseId);
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Caso não encontrado." });
      await assignEquipment(ctx.domain, input.equipmentId, c.personId, ctx.session.id);
    }),

  grantAccess: rhProcedure
    .input(z.object({ grantId: z.string() }))
    .mutation(({ ctx, input }) => grantAccess(ctx.domain, input.grantId, ctx.session.id)),

  scheduleExam: rhProcedure
    .input(ScheduleExamInputSchema)
    .mutation(({ ctx, input }) => scheduleExam(ctx.domain, input.caseId, input.examDate, input.clinic, ctx.session.id)),

  markAccountingSent: rhProcedure.input(CaseIdInput).mutation(({ ctx, input }) => markAccountingSent(ctx.domain, input.caseId, ctx.session.id)),

  grantExtraQuizAttempt: rhProcedure
    .input(CaseIdInput)
    .mutation(({ ctx, input }) => grantExtraQuizAttempt(ctx.domain, input.caseId, ctx.session.id)),

  revealSensitive: rhProcedure
    .input(z.object({ caseId: z.string(), path: z.string() }))
    .mutation(async ({ ctx, input }) => ({ value: await revealSensitive(ctx.domain, input.caseId, input.path, ctx.session.id) })),

  // -------------------------------------------------------------------------------- New joiner
  journey: joinerProcedure.query(({ ctx }) => journey(ctx.domain, ctx.caseId)),

  stage: joinerProcedure
    .input(z.object({ stageId: StageIdSchema }))
    .query(({ ctx, input }) => stageData(ctx.domain, ctx.caseId, input.stageId)),

  markWelcomeSeen: joinerProcedure.mutation(({ ctx }) => markWelcomeSeen(ctx.domain, ctx.session.id)),

  saveDraft: joinerProcedure.input(ValuesInput).mutation(({ ctx, input }) => saveFormDraft(ctx.domain, ctx.caseId, input.values)),

  submitForm: joinerProcedure.input(ValuesInput).mutation(({ ctx, input }) => submitForm(ctx.domain, ctx.caseId, input.values, ctx.session.id)),

  sampleValues: joinerProcedure.query(async ({ ctx }) => {
    requireDemo();
    const person = await ctx.domain.repo.people.get(ctx.session.id);
    const c = await ctx.domain.repo.cases.get(ctx.caseId);
    if (!person || !c) throw new TRPCError({ code: "NOT_FOUND", message: "Caso não encontrado." });
    return sampleFormValues(c.regime, person);
  }),

  submitDocument: joinerProcedure
    .input(z.object({ requirementId: z.string(), file: FileMetaSchema }))
    .mutation(async ({ ctx, input }) => {
      const doc = await submitDocument(ctx.domain, ctx.caseId, input.requirementId, input.file, ctx.session.id);
      return { id: doc.id, autoCheck: doc.autoCheck };
    }),

  simulateDocuments: joinerProcedure.mutation(async ({ ctx }) => {
    requireDemo();
    return { sent: await simulateAllDocuments(ctx.domain, ctx.caseId, ctx.session.id) };
  }),

  signContract: joinerProcedure.mutation(({ ctx }) => signContract(ctx.domain, ctx.caseId, ctx.session.id)),

  declineContract: joinerProcedure
    .input(z.object({ reason: z.string().trim().min(3, "Conte o que precisa mudar.").max(500) }))
    .mutation(({ ctx, input }) => declineContract(ctx.domain, ctx.caseId, input.reason, ctx.session.id)),

  watchVideo: joinerProcedure.input(z.object({ simulated: z.boolean() })).mutation(({ ctx, input }) => {
    if (input.simulated) requireDemo();
    return watchVideo(ctx.domain, ctx.caseId, ctx.session.id, input.simulated);
  }),

  submitQuiz: joinerProcedure
    .input(z.object({ answers: z.array(z.number().int().min(0)).min(1) }))
    .mutation(({ ctx, input }) => submitQuiz(ctx.domain, ctx.caseId, input.answers, ctx.session.id)),

  acknowledgePolicy: joinerProcedure
    .input(z.object({ policyId: z.string() }))
    .mutation(({ ctx, input }) => acknowledgePolicy(ctx.domain, ctx.session.id, input.policyId, ctx.session.id)),

  confirmBenefits: joinerProcedure.mutation(({ ctx }) => confirmBenefits(ctx.domain, ctx.caseId, ctx.session.id)),

  acceptTerm: joinerProcedure
    .input(z.object({ equipmentId: z.string() }))
    .mutation(({ ctx, input }) => acceptEquipmentTerm(ctx.domain, input.equipmentId, ctx.session.id)),

  readAgenda: joinerProcedure.mutation(({ ctx }) => readAgenda(ctx.domain, ctx.caseId, ctx.session.id)),

  checkIn: joinerProcedure.mutation(({ ctx }) => checkIn(ctx.domain, ctx.caseId, ctx.session.id)),

  submitFeedback: joinerProcedure
    .input(FeedbackInputSchema.omit({ caseId: true }))
    .mutation(({ ctx, input }) => submitFeedback(ctx.domain, { ...input, caseId: ctx.caseId }, ctx.session.id)),
});
