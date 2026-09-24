/**
 * Formato do estado em memória da Fase 0 (D-OB-02). Cada coleção vira uma tabela na Fase 1.
 */
import type {
  AccessGrant,
  AssistantFeedback,
  AssistantGap,
  AuditEvent,
  BenefitAck,
  BenefitPlan,
  Contract,
  ContractTemplate,
  DirectoryEntry,
  DocumentSubmission,
  EmailTemplate,
  Equipment,
  FeedbackResponse,
  FirstDayAgenda,
  FormResponse,
  KnowledgeArticle,
  OnboardingCase,
  OutboxEmail,
  Person,
  Policy,
  PolicyAck,
  Project,
  Quiz,
  QuizAttempt,
  RuleFiring,
  TaskInstance,
  TermDocument,
  TimesheetWeek,
  TrainingVideo,
  VideoView,
} from "@/domain/schemas";

export interface MemoryState {
  seq: number;
  clockOffsetDays: number;
  /** Último dia virtual em que o relógio "virou" (clock.tick). */
  lastTickDate?: string;
  contentVersion: number;

  people: Person[];
  cases: OnboardingCase[];
  tasks: TaskInstance[];
  formResponses: FormResponse[];
  documents: DocumentSubmission[];
  contracts: Contract[];
  contractTemplates: ContractTemplate[];

  policies: Policy[];
  policyAcks: PolicyAck[];
  benefitPlans: BenefitPlan[];
  benefitAcks: BenefitAck[];
  video: TrainingVideo;
  quiz: Quiz;
  videoViews: VideoView[];
  quizAttempts: QuizAttempt[];

  equipment: Equipment[];
  accessGrants: AccessGrant[];

  articles: KnowledgeArticle[];
  directory: DirectoryEntry[];
  firstDay: FirstDayAgenda;
  terms: TermDocument[];
  gaps: AssistantGap[];
  assistantFeedback: AssistantFeedback[];

  emailTemplates: EmailTemplate[];
  outbox: OutboxEmail[];
  audit: AuditEvent[];
  ruleFirings: RuleFiring[];
  ruleEnabled: Record<string, boolean>;

  projects: Project[];
  timesheets: TimesheetWeek[];
  surveys: FeedbackResponse[];
}

export function createEmptyState(): MemoryState {
  return {
    seq: 0,
    clockOffsetDays: 0,
    contentVersion: 1,
    people: [],
    cases: [],
    tasks: [],
    formResponses: [],
    documents: [],
    contracts: [],
    contractTemplates: [],
    policies: [],
    policyAcks: [],
    benefitPlans: [],
    benefitAcks: [],
    video: { id: "video-compliance", title: "Vídeo de compliance", durationSec: 480, version: 1, isExample: true },
    quiz: { id: "quiz-compliance", title: "Quiz de compliance", version: 1, passingScore: 80, maxAttempts: 3, questions: [], isExample: true },
    videoViews: [],
    quizAttempts: [],
    equipment: [],
    accessGrants: [],
    articles: [],
    directory: [],
    firstDay: { title: "Primeiro dia", intro: "", items: [], suggestedQuestions: [], isExample: true, bodyMd: "" },
    terms: [],
    gaps: [],
    assistantFeedback: [],
    emailTemplates: [],
    outbox: [],
    audit: [],
    ruleFirings: [],
    ruleEnabled: {},
    projects: [],
    timesheets: [],
    surveys: [],
  };
}
