/**
 * Regras de automação (seção 8.2). Regra é dado: `{ id, name, description, on, when?, actions,
 * enabled, repeatable? }`. `when` é função pura sobre o contexto do caso. Liberar tarefas é papel
 * do motor de fluxo; as ações `create_task`/`unlock_task` dão nome à liberação na linha do tempo
 * (D-OB-28). Desligada no Admin, a regra não dispara: nenhum aviso sai e nada é atribuído a ela.
 */
import type { DomainEventType, StageId } from "@/domain/schemas";

export type RecipientRef =
  | "new_joiner"
  | "rh"
  | "ti"
  | "gestor"
  | "task_owner"
  | "people_active"
  | "people_eligible";

export type RuleAction =
  | { type: "send_email"; template: string; to: RecipientRef; cc?: RecipientRef[] }
  | { type: "create_task"; taskId: string }
  | { type: "unlock_task"; taskId: string }
  | { type: "record_evidence"; evidence: "comprovante_treinamento" }
  | { type: "require_reack" }
  | { type: "reindex_assistant" };

export interface RuleContext {
  eventType: DomainEventType;
  payload: Record<string, unknown>;
  stagesDone: ReadonlySet<StageId>;
  quizAttemptsLeft: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  on: DomainEventType;
  /** Condição em linguagem simples (Admin). */
  conditionLabel?: string;
  /** Para quem (Admin). */
  audience: string;
  when?: (ctx: RuleContext) => boolean;
  /** Regras agendadas avaliadas a cada virada de dia (clock.tick). */
  schedule?: "vespera_inicio" | "tarefa_parada";
  actions: RuleAction[];
  enabled: boolean;
  repeatable?: boolean;
}

const PRE_FIRST_DAY: StageId[] = ["contrato", "compliance", "politicas-beneficios", "equipamentos-acessos"];

export const automationRules: AutomationRule[] = [
  {
    id: "A01",
    name: "Boas-vindas",
    description: "E-mail de boas-vindas com o link do portal.",
    on: "case.created",
    audience: "New joiner (e-mail pessoal)",
    actions: [{ type: "send_email", template: "boas-vindas", to: "new_joiner" }],
    enabled: true,
  },
  {
    id: "A02",
    name: "Documentos recebidos",
    description: "Cria \"Revisar documentos\" e avisa o RH.",
    on: "documents.all_submitted",
    audience: "RH",
    actions: [
      { type: "create_task", taskId: "revisao-documentos" },
      { type: "send_email", template: "rh-documentos-recebidos", to: "rh" },
    ],
    enabled: true,
  },
  {
    id: "A03",
    name: "Compliance liberado",
    description: "Libera o vídeo de compliance e envia \"Seu treinamento de compliance\".",
    on: "documents.all_submitted",
    audience: "New joiner",
    actions: [
      { type: "unlock_task", taskId: "video-compliance" },
      { type: "send_email", template: "compliance-liberado", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A04",
    name: "Documento rejeitado",
    description: "E-mail com o motivo e o link para reenviar.",
    on: "document.rejected",
    audience: "New joiner",
    actions: [{ type: "send_email", template: "documento-rejeitado", to: "new_joiner" }],
    enabled: true,
    repeatable: true,
  },
  {
    id: "A05",
    name: "Documentos aprovados",
    description: "Cria \"Preparar e enviar contrato\".",
    on: "documents.all_approved",
    audience: "RH",
    actions: [{ type: "create_task", taskId: "contrato-preparar" }],
    enabled: true,
  },
  {
    id: "A06",
    name: "Contrato para assinatura",
    description: "Libera a assinatura e envia \"Seu contrato está pronto para assinatura\".",
    on: "contract.sent",
    audience: "New joiner",
    actions: [
      { type: "unlock_task", taskId: "contrato-assinar" },
      { type: "send_email", template: "contrato-para-assinatura", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A07",
    name: "Contrato assinado",
    description:
      "Cria \"Criar e-mail corporativo\", \"Liberar acessos\" e, se precisar, \"Atribuir notebook\"; libera a agenda do primeiro dia; avisa RH/TI.",
    on: "contract.signed",
    audience: "RH/TI",
    actions: [
      { type: "create_task", taskId: "email-corporativo" },
      { type: "create_task", taskId: "acessos" },
      { type: "create_task", taskId: "notebook-atribuir" },
      { type: "create_task", taskId: "envio-contabilidade" },
      { type: "unlock_task", taskId: "primeiro-dia-agenda" },
      { type: "send_email", template: "rh-contrato-assinado", to: "rh" },
    ],
    enabled: true,
  },
  {
    id: "A08",
    name: "Quiz liberado",
    description: "Libera o quiz e envia \"Quiz liberado\".",
    on: "video.watched",
    audience: "New joiner",
    actions: [
      { type: "unlock_task", taskId: "quiz-compliance" },
      { type: "send_email", template: "quiz-liberado", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A09",
    name: "Quiz aprovado",
    description: "Registra a evidência, libera o Código de Conduta e as políticas e envia o comprovante.",
    on: "quiz.passed",
    audience: "New joiner",
    actions: [
      { type: "record_evidence", evidence: "comprovante_treinamento" },
      { type: "unlock_task", taskId: "aceite-conduta" },
      { type: "unlock_task", taskId: "aceite-viagens" },
      { type: "unlock_task", taskId: "aceite-ti" },
      { type: "unlock_task", taskId: "aceite-rotina" },
      { type: "unlock_task", taskId: "beneficios" },
      { type: "send_email", template: "quiz-aprovado", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A10",
    name: "Nova tentativa de quiz",
    description: "E-mail \"Você pode tentar de novo\".",
    on: "quiz.failed",
    conditionLabel: "Ainda há tentativas",
    audience: "New joiner",
    when: (ctx) => ctx.quizAttemptsLeft > 0,
    actions: [{ type: "send_email", template: "quiz-nova-tentativa", to: "new_joiner" }],
    enabled: true,
    repeatable: true,
  },
  {
    id: "A11",
    name: "Termo do notebook",
    description: "Dispara o termo de responsabilidade e avisa por e-mail.",
    on: "equipment.assigned",
    audience: "New joiner",
    // O termo do conteúdo é o do notebook; monitor ou headset não disparam o termo.
    when: (ctx) => ctx.payload.type === "notebook",
    actions: [
      { type: "unlock_task", taskId: "notebook-termo" },
      { type: "send_email", template: "termo-notebook", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A12",
    name: "Acessos prontos",
    description: "E-mail \"Seus acessos estão prontos\" com instruções de primeiro acesso (nunca senha).",
    on: "access.all_granted",
    audience: "New joiner",
    actions: [{ type: "send_email", template: "acessos-prontos", to: "new_joiner" }],
    enabled: true,
  },
  {
    id: "A13",
    name: "Tudo pronto para o primeiro dia",
    description: "E-mail \"Está tudo pronto para o seu primeiro dia\" com a agenda, com cópia ao gestor.",
    on: "stage.completed",
    conditionLabel: "Etapas 3 a 6 concluídas",
    audience: "New joiner, gestor",
    when: (ctx) => PRE_FIRST_DAY.every((s) => ctx.stagesDone.has(s)),
    actions: [{ type: "send_email", template: "primeiro-dia-pronto", to: "new_joiner", cc: ["gestor"] }],
    enabled: true,
  },
  {
    id: "A14",
    name: "Véspera do primeiro dia",
    description: "E-mail \"Amanhã é o seu primeiro dia\".",
    on: "clock.tick",
    conditionLabel: "Véspera da data de início",
    audience: "New joiner",
    schedule: "vespera_inicio",
    actions: [{ type: "send_email", template: "vespera-primeiro-dia", to: "new_joiner" }],
    enabled: true,
  },
  {
    id: "A15",
    name: "Lembrete de pendência",
    description: "Lembrete a cada 3 dias para tarefas paradas.",
    on: "clock.tick",
    conditionLabel: "Tarefa disponível há 3 dias ou mais",
    audience: "Dono da tarefa",
    schedule: "tarefa_parada",
    actions: [{ type: "send_email", template: "lembrete-pendencia", to: "task_owner" }],
    enabled: true,
    repeatable: true,
  },
  {
    id: "A16",
    name: "Pesquisa de onboarding",
    description: "Libera a pesquisa e envia \"Como foi o seu onboarding?\".",
    on: "first_day.checked_in",
    audience: "New joiner",
    actions: [
      { type: "unlock_task", taskId: "feedback" },
      { type: "send_email", template: "pesquisa-onboarding", to: "new_joiner" },
    ],
    enabled: true,
  },
  {
    id: "A17",
    name: "Onboarding concluído",
    description: "Aviso ao RH com o resumo e a nota da pesquisa.",
    on: "case.completed",
    audience: "RH",
    actions: [{ type: "send_email", template: "rh-onboarding-concluido", to: "rh" }],
    enabled: true,
  },
  {
    id: "A18",
    name: "Nova versão de política",
    description: "Cria re-aceite pendente para todos os ativos e avisa por e-mail.",
    on: "policy.version_published",
    audience: "Colaboradores e new joiners",
    actions: [
      { type: "require_reack" },
      { type: "send_email", template: "politica-nova-versao", to: "people_active" },
    ],
    enabled: true,
    repeatable: true,
  },
  {
    id: "A19",
    name: "Mudança de benefício",
    description: "E-mail comunicando a mudança e reindexação do assistente.",
    on: "benefit.provider_changed",
    audience: "Elegíveis",
    actions: [
      { type: "send_email", template: "beneficio-mudou", to: "people_eligible" },
      { type: "reindex_assistant" },
    ],
    enabled: true,
  },
];

export function ruleById(id: string): AutomationRule | undefined {
  return automationRules.find((r) => r.id === id);
}
