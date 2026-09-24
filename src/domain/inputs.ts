/**
 * Schemas de entrada compartilhados entre formulários (react-hook-form) e API (tRPC).
 */
import { z } from "zod";

import { DateOnlySchema, RegimeSchema } from "./schemas";

export const CreateCaseInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe o nome completo.")
      .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
    personalEmail: z.string().trim().pipe(z.email("E-mail inválido.")),
    phone: z.string().trim().optional(),
    regime: RegimeSchema,
    jobTitle: z.string().trim().min(2, "Informe o cargo."),
    startDate: DateOnlySchema,
    managerId: z.string().min(1, "Escolha o gestor."),
    initialProjectId: z.string().optional(),
    needsNotebook: z.boolean(),
    contractMode: z.enum(["modelo", "customizado"]),
    contractTemplateId: z.string().optional(),
  })
  .refine((v) => v.contractMode === "customizado" || !!v.contractTemplateId, {
    path: ["contractTemplateId"],
    message: "Escolha um modelo de contrato.",
  });
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const FileMetaSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().nonnegative(),
});
export type FileMeta = z.infer<typeof FileMetaSchema>;

export const ReviewDocumentInputSchema = z
  .object({
    documentId: z.string(),
    decision: z.enum(["aprovar", "rejeitar"]),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.decision === "aprovar" || (v.reason && v.reason.length > 0), {
    path: ["reason"],
    message: "Informe o motivo da rejeição.",
  });

export const SendContractInputSchema = z.object({
  caseId: z.string(),
  mode: z.enum(["modelo", "customizado"]),
  templateId: z.string().optional(),
  fileName: z.string().max(200).optional(),
});

export const FeedbackInputSchema = z.object({
  caseId: z.string(),
  nps: z.number().int().min(0).max(10),
  missing: z.string().trim().max(1000).optional(),
  confusing: z.string().trim().max(1000).optional(),
});

export const ScheduleExamInputSchema = z.object({
  caseId: z.string(),
  examDate: DateOnlySchema,
  clinic: z.string().trim().min(2, "Informe a clínica.").max(120),
});

export const CorporateEmailInputSchema = z.object({
  caseId: z.string(),
  email: z.string().trim().pipe(z.email("E-mail inválido.")),
});

export const NewEquipmentInputSchema = z.object({
  assetTag: z.string().trim().min(3, "Informe o patrimônio.").max(40),
  type: z.enum(["notebook", "monitor", "headset", "outros"]),
  model: z.string().trim().min(2, "Informe o modelo.").max(80),
  serial: z.string().trim().min(2, "Informe o número de série.").max(60),
});
export type NewEquipmentInput = z.infer<typeof NewEquipmentInputSchema>;

/** Linhas da grade semanal de horas (seção 9.8). */
export const TimesheetRowsSchema = z
  .array(
    z.object({
      projectId: z.string().min(1),
      hours: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
    }),
  )
  .max(12);

export const SaveTimesheetInputSchema = z.object({
  weekStart: DateOnlySchema,
  rows: TimesheetRowsSchema,
  submit: z.boolean().default(false),
});
export type SaveTimesheetInput = z.infer<typeof SaveTimesheetInputSchema>;

export const PublishPolicyInputSchema = z.object({
  policyId: z.string(),
  summary: z.string().trim().min(10, "Escreva um resumo da política.").max(400),
  bodyMd: z.string().trim().min(20, "O texto da política está curto demais."),
  changelog: z.string().trim().min(5, "Descreva o que mudou.").max(400),
  effectiveFrom: DateOnlySchema,
});

export const ChangeBenefitInputSchema = z.object({
  category: z.enum(["saude", "odonto", "outros"]),
  providerName: z.string().trim().min(2, "Informe o provedor.").max(80),
  validFrom: DateOnlySchema,
  summaryMd: z.string().trim().min(10, "Escreva um resumo.").max(2000),
  howToUseMd: z.string().trim().min(10, "Explique como usar.").max(4000),
  videoUrl: z.string().trim().url("URL inválida.").optional().or(z.literal("")),
  eligibleRegimes: z.array(RegimeSchema).min(1, "Escolha pelo menos um regime."),
});
