/**
 * Interface de dados (D-OB-03). Na Fase 0, `MemoryRepository`; na Fase 1, `PrismaRepository`
 * implementa a mesma interface sem mudar serviços, routers nem telas. Tudo é assíncrono por isso.
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

export interface DataRepository {
  /** Gera um id novo com prefixo legível (`doc-12`). */
  newId(prefix: string): string;

  people: {
    list(): Promise<Person[]>;
    get(id: string): Promise<Person | undefined>;
    insert(person: Person): Promise<Person>;
    update(id: string, patch: Partial<Person>): Promise<Person>;
  };
  cases: {
    list(): Promise<OnboardingCase[]>;
    get(id: string): Promise<OnboardingCase | undefined>;
    getByPerson(personId: string): Promise<OnboardingCase | undefined>;
    insert(c: OnboardingCase): Promise<OnboardingCase>;
    update(id: string, patch: Partial<OnboardingCase>): Promise<OnboardingCase>;
  };
  tasks: {
    listAll(): Promise<TaskInstance[]>;
    listByCase(caseId: string): Promise<TaskInstance[]>;
    insertMany(tasks: TaskInstance[]): Promise<void>;
    update(id: string, patch: Partial<TaskInstance>): Promise<TaskInstance>;
  };
  forms: {
    get(caseId: string): Promise<FormResponse | undefined>;
    save(response: FormResponse): Promise<FormResponse>;
  };
  documents: {
    listByCase(caseId: string): Promise<DocumentSubmission[]>;
    get(id: string): Promise<DocumentSubmission | undefined>;
    insert(doc: DocumentSubmission): Promise<DocumentSubmission>;
    update(id: string, patch: Partial<DocumentSubmission>): Promise<DocumentSubmission>;
  };
  contracts: {
    getByCase(caseId: string): Promise<Contract | undefined>;
    save(contract: Contract): Promise<Contract>;
    listTemplates(): Promise<ContractTemplate[]>;
  };
  policies: {
    /** Todas as versões de todas as políticas. */
    listVersions(): Promise<Policy[]>;
    insertVersion(policy: Policy): Promise<Policy>;
  };
  policyAcks: {
    list(): Promise<PolicyAck[]>;
    listByPerson(personId: string): Promise<PolicyAck[]>;
    insert(ack: PolicyAck): Promise<PolicyAck>;
  };
  benefits: {
    list(): Promise<BenefitPlan[]>;
    insert(plan: BenefitPlan): Promise<BenefitPlan>;
    update(id: string, patch: Partial<BenefitPlan>): Promise<BenefitPlan>;
  };
  benefitAcks: {
    list(): Promise<BenefitAck[]>;
    insert(ack: BenefitAck): Promise<BenefitAck>;
  };
  training: {
    getVideo(): Promise<TrainingVideo>;
    saveVideo(video: TrainingVideo): Promise<TrainingVideo>;
    getQuiz(): Promise<Quiz>;
    saveQuiz(quiz: Quiz): Promise<Quiz>;
    listVideoViews(): Promise<VideoView[]>;
    insertVideoView(view: VideoView): Promise<VideoView>;
    listQuizAttempts(): Promise<QuizAttempt[]>;
    insertQuizAttempt(attempt: QuizAttempt): Promise<QuizAttempt>;
  };
  equipment: {
    list(): Promise<Equipment[]>;
    get(id: string): Promise<Equipment | undefined>;
    insert(item: Equipment): Promise<Equipment>;
    update(id: string, patch: Partial<Equipment>): Promise<Equipment>;
  };
  access: {
    list(): Promise<AccessGrant[]>;
    insertMany(grants: AccessGrant[]): Promise<void>;
    update(id: string, patch: Partial<AccessGrant>): Promise<AccessGrant>;
  };
  knowledge: {
    listArticles(): Promise<KnowledgeArticle[]>;
    saveArticle(article: KnowledgeArticle): Promise<KnowledgeArticle>;
    listDirectory(): Promise<DirectoryEntry[]>;
    saveDirectoryEntry(entry: DirectoryEntry): Promise<DirectoryEntry>;
    getFirstDay(): Promise<FirstDayAgenda>;
    listTerms(): Promise<TermDocument[]>;
  };
  assistant: {
    listGaps(): Promise<AssistantGap[]>;
    insertGap(gap: AssistantGap): Promise<AssistantGap>;
    updateGap(id: string, patch: Partial<AssistantGap>): Promise<AssistantGap>;
    listFeedback(): Promise<AssistantFeedback[]>;
    insertFeedback(feedback: AssistantFeedback): Promise<AssistantFeedback>;
  };
  email: {
    listTemplates(): Promise<EmailTemplate[]>;
    listOutbox(): Promise<OutboxEmail[]>;
    insertOutbox(email: OutboxEmail): Promise<OutboxEmail>;
  };
  audit: {
    list(): Promise<AuditEvent[]>;
    listByCase(caseId: string): Promise<AuditEvent[]>;
    insert(event: AuditEvent): Promise<AuditEvent>;
  };
  automations: {
    listFirings(): Promise<RuleFiring[]>;
    insertFiring(firing: RuleFiring): Promise<RuleFiring>;
    getEnabledOverrides(): Promise<Record<string, boolean>>;
    setEnabled(ruleId: string, enabled: boolean): Promise<void>;
  };
  projects: {
    list(): Promise<Project[]>;
  };
  timesheets: {
    list(): Promise<TimesheetWeek[]>;
    save(week: TimesheetWeek): Promise<TimesheetWeek>;
  };
  surveys: {
    list(): Promise<FeedbackResponse[]>;
    insert(response: FeedbackResponse): Promise<FeedbackResponse>;
  };
  meta: {
    getLastTickDate(): Promise<string | undefined>;
    setLastTickDate(key: string): Promise<void>;
    getContentVersion(): Promise<number>;
    bumpContentVersion(): Promise<number>;
  };

  getClockOffset(): Promise<number>;
  setClockOffset(days: number): Promise<void>;
  /** Volta aos dados iniciais (seed). */
  reset(): Promise<void>;
}
