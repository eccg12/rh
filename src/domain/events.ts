/**
 * Eventos de domínio (seção 8.1) e vocabulário da linha do tempo.
 */
import type { DomainEventType } from "./schemas";

export interface DomainEventInput {
  type: DomainEventType;
  caseId?: string;
  personId?: string;
  /** Id da pessoa, `automacao` ou `sistema` (D-OB-22). */
  actorId: string;
  payload?: Record<string, unknown>;
  /** Chave do assunto para eventos sem caso (ex.: versão publicada), base da idempotência. */
  subjectKey?: string;
}

/** Eventos derivados que acontecem uma única vez por caso. */
export const ONCE_PER_CASE: ReadonlySet<DomainEventType> = new Set([
  "documents.all_approved",
  "access.all_granted",
  "policies.all_acknowledged",
  "case.completed",
]);

/** Rótulos de auditoria e linha do tempo (texto que a pessoa entende). */
export const EVENT_LABELS: Record<string, string> = {
  "case.created": "Caso criado",
  "form.submitted": "Ficha cadastral enviada",
  "document.submitted": "Documento enviado",
  "documents.all_submitted": "Todos os documentos obrigatórios enviados",
  "document.approved": "Documento aprovado",
  "document.rejected": "Documento rejeitado",
  "documents.all_approved": "Todos os documentos aprovados",
  "contract.sent": "Contrato enviado para assinatura",
  "contract.signed": "Contrato assinado",
  "contract.declined": "Contrato recusado",
  "video.watched": "Vídeo de compliance assistido",
  "quiz.passed": "Quiz de compliance aprovado",
  "quiz.failed": "Quiz de compliance sem a nota mínima",
  "policy.acknowledged": "Política aceita",
  "policies.all_acknowledged": "Todas as políticas aceitas",
  "benefits.confirmed": "Ciência dos benefícios",
  "equipment.assigned": "Equipamento atribuído",
  "equipment.term_accepted": "Termo do equipamento aceito",
  "access.granted": "Acesso liberado",
  "access.all_granted": "Todos os acessos liberados",
  "stage.completed": "Etapa concluída",
  "first_day.checked_in": "Check-in do primeiro dia",
  "case.completed": "Onboarding concluído",
  "policy.version_published": "Nova versão de política publicada",
  "benefit.provider_changed": "Provedor de benefício trocado",
  "task.completed": "Tarefa concluída",
  "feedback.submitted": "Pesquisa de onboarding respondida",
  // Registros de auditoria (não são eventos de domínio)
  "task.unlocked": "Tarefa liberada",
  "email.sent": "E-mail enviado",
  "evidence.recorded": "Evidência registrada",
  "assistant.reindexed": "Assistente reindexado",
  "policy.reack_required": "Re-aceite pendente criado",
  "sensitive.revealed": "Dado sensível exibido",
  "welcome.seen": "Primeiro acesso ao portal",
  "quiz.extra_attempt": "Nova tentativa de quiz liberada",
  "rule.toggled": "Regra de automação alterada",
  "content.updated": "Conteúdo atualizado",
  "equipment.created": "Equipamento cadastrado",
  "demo.day_advanced": "Data virtual avançada",
  "demo.reset": "Dados iniciais restaurados",
  "timesheet.submitted": "Semana de horas enviada",
};

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type;
}
