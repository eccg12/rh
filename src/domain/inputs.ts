/**
 * Schemas de entrada compartilhados entre formulários (react-hook-form) e API (tRPC).
 */
import { z } from "zod";

import { DateOnlySchema, KbCategorySchema, RegimeSchema } from "./schemas";

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

export const UpdateVideoInputSchema = z.object({
  title: z.string().trim().min(3, "Escreva o título do vídeo.").max(120),
  url: z.string().trim().url("URL inválida.").optional().or(z.literal("")),
  durationSec: z.number().int().min(30, "O vídeo precisa ter pelo menos 30 segundos.").max(3 * 3600, "Vídeo longo demais."),
  description: z.string().trim().max(600).optional(),
});

export const UpdateQuizInputSchema = z.object({
  title: z.string().trim().min(3, "Escreva o título do quiz.").max(120),
  passingScore: z.number().int().min(50, "A nota mínima precisa ser de pelo menos 50%.").max(100),
  maxAttempts: z.number().int().min(1, "Pelo menos uma tentativa.").max(10),
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        prompt: z.string().trim().min(5, "Escreva a pergunta."),
        options: z.array(z.string().trim().min(1, "Há uma opção vazia.")).min(2, "Cada pergunta precisa de pelo menos duas opções.").max(6),
        correctIndex: z.number().int().min(0),
        explanation: z.string().trim().min(5, "Explique a resposta correta."),
      }),
    )
    .min(1, "O quiz precisa de pelo menos uma pergunta.")
    .max(20),
  isExample: z.boolean(),
});
export type UpdateQuizInput = z.infer<typeof UpdateQuizInputSchema>;

export const SaveArticleInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(5, "Escreva o título.").max(120),
  category: KbCategorySchema,
  summary: z.string().trim().min(10, "Escreva um resumo de uma ou duas frases.").max(300),
  bodyMd: z.string().trim().min(20, "O texto do artigo está curto demais.").max(8000),
  tags: z.array(z.string().trim().min(1)).max(20),
  ownerPersonId: z.string().optional(),
  isExample: z.boolean(),
  fromGapId: z.string().optional(),
});
export type SaveArticleInput = z.infer<typeof SaveArticleInputSchema>;

export const SaveDirectoryInputSchema = z.object({
  personId: z.string().min(1),
  topics: z.array(z.string().trim().min(2)).min(1, "Informe pelo menos um tema.").max(10),
  categories: z.array(KbCategorySchema),
  channel: z.string().trim().min(2, "Informe o canal de contato.").max(60),
  toValidate: z.boolean(),
});
export type SaveDirectoryInput = z.infer<typeof SaveDirectoryInputSchema>;

export type PublishPolicyInput = z.infer<typeof PublishPolicyInputSchema>;
export type ChangeBenefitInput = z.infer<typeof ChangeBenefitInputSchema>;
