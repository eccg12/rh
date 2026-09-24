/**
 * Modelo de domínio (docs/PLANO.md, seção 6). Os tipos TypeScript saem de `z.infer`.
 * Datas em ISO 8601 (UTC); datas sem hora (data de início, vigência) em `YYYY-MM-DD`.
 * Extensões ao plano estão registradas em docs/DECISIONS.md.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------------------------
// Básicos
// ---------------------------------------------------------------------------------------------

export const RoleSchema = z.enum(["ADMIN_RH", "GESTOR", "COLABORADOR", "NEW_JOINER"]);
export type Role = z.infer<typeof RoleSchema>;

/** Visão que cada módulo renderiza (D-OB-08). GESTOR sozinho usa a visão de colaborador. */
export const ViewRoleSchema = z.enum(["ADMIN_RH", "NEW_JOINER", "COLABORADOR"]);
export type ViewRole = z.infer<typeof ViewRoleSchema>;

export const RegimeSchema = z.enum(["PJ", "CLT"]);
export type Regime = z.infer<typeof RegimeSchema>;

export const OwnerSchema = z.enum(["new_joiner", "rh", "ti", "gestor"]);
export type Owner = z.infer<typeof OwnerSchema>;

/** Data sem hora, no calendário de São Paulo. */
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

// ---------------------------------------------------------------------------------------------
// Eventos de domínio (seção 8.1)
// ---------------------------------------------------------------------------------------------

export const DomainEventTypeSchema = z.enum([
  "case.created",
  "form.submitted",
  "document.submitted",
  "documents.all_submitted",
  "document.approved",
  "document.rejected",
  "documents.all_approved",
  "contract.sent",
  "contract.signed",
  "contract.declined",
  "video.watched",
  "quiz.passed",
  "quiz.failed",
  "policy.acknowledged",
  "policies.all_acknowledged",
  "benefits.confirmed",
  "equipment.assigned",
  "equipment.term_accepted",
  "access.granted",
  "access.all_granted",
  "stage.completed",
  "first_day.checked_in",
  "case.completed",
  "policy.version_published",
  "benefit.provider_changed",
  "clock.tick",
]);
export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;

// ---------------------------------------------------------------------------------------------
// Pessoas e casos
// ---------------------------------------------------------------------------------------------

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  preferredName: z.string().optional(),
  roles: z.array(RoleSchema).min(1),
  personalEmail: z.string(),
  corporateEmail: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  regime: RegimeSchema.optional(),
  startDate: DateOnlySchema.optional(),
  managerId: z.string().optional(),
  avatarUrl: z.string().optional(),
  welcomeSeenAt: z.string().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const CaseStatusSchema = z.enum(["em_andamento", "concluido", "cancelado"]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const OnboardingCaseSchema = z.object({
  id: z.string(),
  personId: z.string(),
  regime: RegimeSchema,
  workflowId: z.string(),
  workflowVersion: z.number().int(),
  createdAt: z.string(),
  createdById: z.string(),
  startDate: DateOnlySchema,
  initialProjectId: z.string().optional(),
  needsNotebook: z.boolean(),
  contractMode: z.enum(["modelo", "customizado"]),
  contractTemplateId: z.string().optional(),
  status: CaseStatusSchema,
  completedAt: z.string().optional(),
  /** Tentativas extras de quiz liberadas pelo RH (extensão, D-OB-24). */
  extraQuizAttempts: z.number().int().min(0).default(0),
});
export type OnboardingCase = z.infer<typeof OnboardingCaseSchema>;

// ---------------------------------------------------------------------------------------------
// Fluxo (seção 7)
// ---------------------------------------------------------------------------------------------

export const StageIdSchema = z.enum([
  "pre-admissao",
  "cadastro-documentos",
  "contrato",
  "compliance",
  "politicas-beneficios",
  "equipamentos-acessos",
  "primeiro-dia",
  "feedback",
]);
export type StageId = z.infer<typeof StageIdSchema>;

export const TaskKindSchema = z.enum([
  "cadastro",
  "ficha",
  "documentos",
  "revisao_documentos",
  "contrato_preparar",
  "contrato_assinar",
  "video",
  "quiz",
  "aceite_politica",
  "beneficios",
  "email_corporativo",
  "equipamento_atribuir",
  "termo_equipamento",
  "acessos",
  "exame_agendar",
  "exame_aso",
  "envio_contabilidade",
  "primeiro_dia_agenda",
  "primeiro_dia_checkin",
  "feedback",
]);
export type TaskKind = z.infer<typeof TaskKindSchema>;

/** Condições de liberação. `stage_done` é extensão ao plano (D-OB-21). */
export const UnlockConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task_done"), taskId: z.string() }),
  z.object({ type: z.literal("event"), event: DomainEventTypeSchema }),
  z.object({
    type: z.literal("date_reached"),
    field: z.literal("startDate"),
    offsetDays: z.number().int().optional(),
  }),
  z.object({ type: z.literal("stage_done"), stageId: StageIdSchema }),
]);
export type UnlockCondition = z.infer<typeof UnlockConditionSchema>;

export const TaskDefinitionSchema = z.object({
  id: z.string(),
  kind: TaskKindSchema,
  title: z.string(),
  /** Rótulo curto do botão de ação ("Revisar", "Enviar contrato"). */
  actionLabel: z.string().optional(),
  description: z.string().optional(),
  owner: OwnerSchema,
  required: z.boolean(),
  estimatedMinutes: z.number().int().optional(),
  unlockWhen: z.array(UnlockConditionSchema).optional(),
  appliesWhen: z.literal("needsNotebook").optional(),
  ref: z.string().optional(),
});
export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

export const StageDefinitionSchema = z.object({
  id: StageIdSchema,
  order: z.number().int(),
  title: z.string(),
  summary: z.string(),
  /** Etapa que espera a data de início: fica fora do cálculo de gargalo (D-OB-23). */
  waitsForStartDate: z.boolean().optional(),
  tasks: z.array(TaskDefinitionSchema),
});
export type StageDefinition = z.infer<typeof StageDefinitionSchema>;

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  regime: RegimeSchema,
  version: z.number().int(),
  title: z.string(),
  /** Selo exibido na interface (ex.: fluxo CLT em validação). */
  badge: z.string().optional(),
  stages: z.array(StageDefinitionSchema),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const TaskStatusSchema = z.enum([
  "bloqueada",
  "disponivel",
  "em_andamento",
  "aguardando_revisao",
  "concluida",
  "dispensada",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskInstanceSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  taskDefId: z.string(),
  status: TaskStatusSchema,
  availableAt: z.string().optional(),
  completedAt: z.string().optional(),
  completedById: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type TaskInstance = z.infer<typeof TaskInstanceSchema>;

// ---------------------------------------------------------------------------------------------
// Formulários e documentos
// ---------------------------------------------------------------------------------------------

export const FieldTypeSchema = z.enum([
  "text",
  "email",
  "tel",
  "date",
  "cpf",
  "cnpj",
  "cep",
  "select",
  "radio",
  "checkbox",
  "textarea",
  "repeater",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
  helpText: z.string().optional(),
  sensitive: z.boolean().optional(),
  type: FieldTypeSchema,
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  /** Campo exibido só quando outro campo tem certo valor (ex.: dados bancários sem PIX). */
  showWhen: z.object({ fieldId: z.string(), equals: z.union([z.string(), z.boolean()]) }).optional(),
  /** Pré-preenchimento a partir do cadastro. */
  prefillFrom: z.enum(["personalEmail", "name", "phone"]).optional(),
  get fields() {
    return z.array(FieldDefSchema).optional();
  },
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

export const FormSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(FieldDefSchema),
});
export type FormSection = z.infer<typeof FormSectionSchema>;

export const FormSchemaSchema = z.object({
  id: z.string(),
  regime: RegimeSchema,
  title: z.string(),
  /** Nota exibida no topo (ex.: lista CLT a validar com a contabilidade). */
  note: z.string().optional(),
  sections: z.array(FormSectionSchema),
});
export type FormSchema = z.infer<typeof FormSchemaSchema>;

export const FormResponseSchema = z.object({
  caseId: z.string(),
  formId: z.string(),
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["rascunho", "enviado"]),
  updatedAt: z.string().optional(),
  submittedAt: z.string().optional(),
});
export type FormResponse = z.infer<typeof FormResponseSchema>;

export const DocumentRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  regimes: z.array(RegimeSchema),
  /** Exigência por regime (o mesmo documento pode ser obrigatório na CLT e opcional na PJ). */
  requirement: z.partialRecord(RegimeSchema, z.enum(["obrigatorio", "condicional", "opcional"])),
  conditionNote: z.string().optional(),
  accept: z.array(z.string()),
  maxSizeMb: z.number(),
  /** Documento pedido por uma tarefa específica, fora da lista geral (ex.: ASO na CLT). */
  taskOnly: z.boolean().optional(),
});
export type DocumentRequirement = z.infer<typeof DocumentRequirementSchema>;

export const DocumentStatusSchema = z.enum(["enviado", "aprovado", "rejeitado"]);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const AutoCheckSchema = z.object({
  formatOk: z.boolean(),
  sizeOk: z.boolean(),
  notes: z.array(z.string()),
});
export type AutoCheck = z.infer<typeof AutoCheckSchema>;

export const DocumentSubmissionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  requirementId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  submittedAt: z.string(),
  status: DocumentStatusSchema,
  storageRef: z.string().optional(),
  autoCheck: AutoCheckSchema.optional(),
  reviewedById: z.string().optional(),
  reviewedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  /** Envio substituído por um reenvio (histórico preservado). */
  supersededById: z.string().optional(),
});
export type DocumentSubmission = z.infer<typeof DocumentSubmissionSchema>;

// ---------------------------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------------------------

export const ContractStatusSchema = z.enum(["rascunho", "enviado", "assinado", "recusado"]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ContractSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  mode: z.enum(["modelo", "customizado"]),
  templateId: z.string().optional(),
  fileName: z.string().optional(),
  status: ContractStatusSchema,
  sentAt: z.string().optional(),
  signedAt: z.string().optional(),
  signatureRef: z.string().optional(),
  verificationCode: z.string().optional(),
  declinedAt: z.string().optional(),
  declineReason: z.string().optional(),
});
export type Contract = z.infer<typeof ContractSchema>;

export const ContractTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  regimes: z.array(RegimeSchema),
  isExample: z.boolean(),
});
export type ContractTemplate = z.infer<typeof ContractTemplateSchema>;

// ---------------------------------------------------------------------------------------------
// Políticas, benefícios e compliance
// ---------------------------------------------------------------------------------------------

export const PolicyCategorySchema = z.enum(["conduta", "viagens", "ti", "rotina", "privacidade", "outros"]);
export type PolicyCategory = z.infer<typeof PolicyCategorySchema>;

/** Uma versão de política. O repositório guarda todas; a vigente é a de maior versão. */
export const PolicySchema = z.object({
  id: z.string(),
  category: PolicyCategorySchema,
  title: z.string(),
  version: z.number().int().positive(),
  effectiveFrom: DateOnlySchema,
  summary: z.string(),
  bodyMd: z.string(),
  requiresAck: z.boolean(),
  changelog: z.string().optional(),
  isExample: z.boolean(),
  publishedAt: z.string().optional(),
});
export type Policy = z.infer<typeof PolicySchema>;

export const PolicyAckSchema = z.object({
  id: z.string(),
  personId: z.string(),
  policyId: z.string(),
  version: z.number().int(),
  acknowledgedAt: z.string(),
  caseId: z.string().optional(),
});
export type PolicyAck = z.infer<typeof PolicyAckSchema>;

export const BenefitCategorySchema = z.enum(["saude", "odonto", "outros"]);
export type BenefitCategory = z.infer<typeof BenefitCategorySchema>;

export const BenefitPlanSchema = z.object({
  id: z.string(),
  category: BenefitCategorySchema,
  providerName: z.string(),
  active: z.boolean(),
  validFrom: DateOnlySchema,
  validUntil: DateOnlySchema.optional(),
  summaryMd: z.string(),
  howToUseMd: z.string(),
  videoUrl: z.string().optional(),
  eligibleRegimes: z.array(RegimeSchema),
  isExample: z.boolean(),
});
export type BenefitPlan = z.infer<typeof BenefitPlanSchema>;

/** Ciência dos benefícios (extensão: o plano cita "Confirmar ciência" sem entidade própria). */
export const BenefitAckSchema = z.object({
  id: z.string(),
  personId: z.string(),
  caseId: z.string().optional(),
  planIds: z.array(z.string()),
  acknowledgedAt: z.string(),
});
export type BenefitAck = z.infer<typeof BenefitAckSchema>;

export const TrainingVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  durationSec: z.number().int().positive(),
  version: z.number().int().positive(),
  description: z.string().optional(),
  isExample: z.boolean().default(true),
});
export type TrainingVideo = z.infer<typeof TrainingVideoSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.number().int().positive(),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().positive(),
  questions: z.array(QuizQuestionSchema).min(1),
  isExample: z.boolean().default(true),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const VideoViewSchema = z.object({
  id: z.string(),
  personId: z.string(),
  caseId: z.string().optional(),
  videoId: z.string(),
  version: z.number().int(),
  watchedAt: z.string(),
  simulated: z.boolean().optional(),
});
export type VideoView = z.infer<typeof VideoViewSchema>;

export const QuizAttemptSchema = z.object({
  id: z.string(),
  personId: z.string(),
  caseId: z.string().optional(),
  quizId: z.string(),
  quizVersion: z.number().int(),
  videoVersion: z.number().int().optional(),
  answers: z.array(z.number().int()),
  score: z.number(),
  passed: z.boolean(),
  answeredAt: z.string(),
});
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;

// ---------------------------------------------------------------------------------------------
// Equipamentos e acessos
// ---------------------------------------------------------------------------------------------

export const EquipmentTypeSchema = z.enum(["notebook", "monitor", "headset", "outros"]);
export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;

export const EquipmentSchema = z.object({
  id: z.string(),
  assetTag: z.string(),
  type: EquipmentTypeSchema,
  model: z.string(),
  serial: z.string(),
  status: z.enum(["disponivel", "em_uso", "manutencao"]),
  assignedToId: z.string().optional(),
  assignedAt: z.string().optional(),
  termAcceptedAt: z.string().optional(),
  termVersion: z.number().int().optional(),
  notes: z.string().optional(),
});
export type Equipment = z.infer<typeof EquipmentSchema>;

export const AccessGrantSchema = z.object({
  id: z.string(),
  personId: z.string(),
  caseId: z.string().optional(),
  systemId: z.string(),
  system: z.string(),
  owner: z.enum(["rh", "ti", "gestor"]),
  status: z.enum(["pendente", "liberado", "revogado"]),
  grantedAt: z.string().optional(),
  grantedById: z.string().optional(),
});
export type AccessGrant = z.infer<typeof AccessGrantSchema>;

// ---------------------------------------------------------------------------------------------
// Assistente e base de conhecimento
// ---------------------------------------------------------------------------------------------

export const KbCategorySchema = z.enum([
  "despesas",
  "viagens",
  "beneficios",
  "ti",
  "equipamentos",
  "rotina",
  "compliance",
  "pj",
  "primeiro_dia",
  "geral",
]);
export type KbCategory = z.infer<typeof KbCategorySchema>;

export const KnowledgeArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: KbCategorySchema,
  summary: z.string(),
  bodyMd: z.string(),
  tags: z.array(z.string()),
  ownerPersonId: z.string().optional(),
  updatedAt: z.string(),
  isExample: z.boolean(),
});
export type KnowledgeArticle = z.infer<typeof KnowledgeArticleSchema>;

export const DirectoryEntrySchema = z.object({
  personId: z.string(),
  topics: z.array(z.string()),
  categories: z.array(KbCategorySchema),
  channel: z.string(),
  toValidate: z.boolean(),
});
export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>;

export const AssistantGapSchema = z.object({
  id: z.string(),
  question: z.string(),
  askedById: z.string(),
  askedAt: z.string(),
  status: z.enum(["aberta", "resolvida"]),
  resolvedArticleId: z.string().optional(),
  routedToId: z.string().optional(),
});
export type AssistantGap = z.infer<typeof AssistantGapSchema>;

export const AssistantFeedbackSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  helpful: z.boolean(),
  at: z.string(),
  question: z.string().optional(),
  personId: z.string().optional(),
});
export type AssistantFeedback = z.infer<typeof AssistantFeedbackSchema>;

// ---------------------------------------------------------------------------------------------
// E-mail, auditoria e automações
// ---------------------------------------------------------------------------------------------

export const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  bodyMd: z.string(),
  variables: z.array(z.string()),
});
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

export const OutboxEmailSchema = z.object({
  id: z.string(),
  to: z.string(),
  toName: z.string(),
  toPersonId: z.string().optional(),
  cc: z.array(z.string()).optional(),
  subject: z.string(),
  bodyHtml: z.string(),
  templateId: z.string(),
  caseId: z.string().optional(),
  ruleId: z.string().optional(),
  createdAt: z.string(),
  status: z.literal("simulado"),
});
export type OutboxEmail = z.infer<typeof OutboxEmailSchema>;

/** `automacao` = ação automática (conta no indicador); `sistema` = fato derivado (D-OB-22). */
export const AUTOMATION_ACTOR = "automacao" as const;
export const SYSTEM_ACTOR = "sistema" as const;

export const AuditEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  caseId: z.string().optional(),
  personId: z.string().optional(),
  actorId: z.string(),
  at: z.string(),
  ruleId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

/** Registro de disparo de regra, base da idempotência (seção 8.3). */
export const RuleFiringSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  key: z.string(),
  caseId: z.string().optional(),
  eventType: z.string(),
  firedAt: z.string(),
});
export type RuleFiring = z.infer<typeof RuleFiringSchema>;

// ---------------------------------------------------------------------------------------------
// Projetos, apontamento e pesquisa
// ---------------------------------------------------------------------------------------------

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const WeekHoursSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]);

export const TimesheetWeekSchema = z.object({
  id: z.string(),
  personId: z.string(),
  weekStart: DateOnlySchema,
  status: z.enum(["rascunho", "enviado"]),
  submittedAt: z.string().optional(),
  rows: z.array(z.object({ projectId: z.string(), hours: WeekHoursSchema })),
});
export type TimesheetWeek = z.infer<typeof TimesheetWeekSchema>;

export const FeedbackResponseSchema = z.object({
  caseId: z.string(),
  nps: z.number().int().min(0).max(10),
  missing: z.string().optional(),
  confusing: z.string().optional(),
  submittedAt: z.string(),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

/** Agenda do primeiro dia (content/primeiro-dia.md). */
export const FirstDayAgendaSchema = z.object({
  title: z.string(),
  intro: z.string(),
  items: z.array(z.object({ time: z.string(), title: z.string(), detail: z.string().optional() })),
  suggestedQuestions: z.array(z.string()),
  isExample: z.boolean(),
  bodyMd: z.string(),
});
export type FirstDayAgenda = z.infer<typeof FirstDayAgendaSchema>;

/** Termo (notebook, privacidade). */
export const TermDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.number().int(),
  bodyMd: z.string(),
  isExample: z.boolean(),
});
export type TermDocument = z.infer<typeof TermDocumentSchema>;
