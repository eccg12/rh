/**
 * Texto da linha do tempo e da auditoria: cada registro vira uma frase que a pessoa entende
 * ("avisos automáticos", não "webhooks").
 */
import { requirementById } from "@/config/documents";
import { firstName } from "@/lib/format";

import { eventLabel } from "./events";
import type { AuditEvent, Person } from "./schemas";
import { AUTOMATION_ACTOR, SYSTEM_ACTOR } from "./schemas";

export interface TimelineEntry {
  id: string;
  at: string;
  type: string;
  title: string;
  detail?: string;
  automated: boolean;
  actorName: string;
  ruleId?: string;
  caseId?: string;
  personId?: string;
}

function str(v: unknown): string | undefined {
  return v === undefined || v === null || v === "" ? undefined : String(v);
}

export function describeAudit(e: AuditEvent, people: Map<string, Person>): TimelineEntry {
  const p = e.payload ?? {};
  const person = e.personId ? people.get(e.personId) : undefined;
  const who = person ? firstName(person.name) : undefined;
  const actor = e.actorId === AUTOMATION_ACTOR ? "Automação" : e.actorId === SYSTEM_ACTOR ? "Sistema" : (people.get(e.actorId)?.name ?? e.actorId);
  let title = eventLabel(e.type);
  let detail: string | undefined;

  switch (e.type) {
    case "case.created":
      title = `Caso criado por ${actor}`;
      detail = [str(p.regime), str(p.jobTitle)].filter(Boolean).join(", ") || undefined;
      break;
    case "task.unlocked": {
      const owner = String(p.owner ?? "");
      title = owner === "new_joiner" ? `Liberado para ${who ?? "o new joiner"}: ${String(p.title ?? "")}` : `Tarefa criada para ${owner === "ti" ? "TI" : owner === "gestor" ? "o gestor" : "o RH"}: ${String(p.title ?? "")}`;
      break;
    }
    case "email.sent":
      title = `E-mail para ${String(p.toName ?? p.to ?? "")}: ${String(p.subject ?? "")}`;
      detail = str(p.to);
      break;
    case "document.submitted":
    case "document.approved":
    case "document.rejected": {
      const reqTitle = str(p.title) ?? requirementById(String(p.requirementId ?? ""))?.title ?? "Documento";
      title = `${eventLabel(e.type)}: ${reqTitle}`;
      detail = e.type === "document.rejected" ? `Motivo: ${String(p.reason ?? "não informado")}` : str(p.fileName);
      if (e.type === "document.submitted" && p.resubmission) title = `Documento reenviado: ${reqTitle}`;
      break;
    }
    case "documents.all_submitted":
      detail = p.count ? `${String(p.count)} documentos obrigatórios` : undefined;
      break;
    case "quiz.passed":
    case "quiz.failed":
      detail = `Nota ${String(p.score ?? 0)}%, tentativa ${String(p.attempt ?? 1)}`;
      break;
    case "evidence.recorded":
      title = `Comprovante de treinamento emitido: ${String(p.code ?? "")}`;
      detail = p.score !== undefined ? `Nota ${String(p.score)}%, quiz v${String(p.quizVersion ?? 1)}, vídeo v${String(p.videoVersion ?? 1)}` : undefined;
      break;
    case "policy.acknowledged":
      title = `Política aceita: ${String(p.title ?? p.policyId ?? "")}`;
      detail = p.version ? `Versão ${String(p.version)}` : undefined;
      break;
    case "contract.sent":
      detail = p.mode === "customizado" ? "Contrato customizado" : "Modelo padrão";
      break;
    case "contract.signed":
      detail = p.verificationCode ? `Código de verificação ${String(p.verificationCode)}` : undefined;
      break;
    case "contract.declined":
      detail = str(p.reason);
      break;
    case "equipment.assigned":
      title = `Equipamento atribuído: ${String(p.assetTag ?? "")}`;
      detail = str(p.model);
      break;
    case "equipment.term_accepted":
      title = `Termo aceito: ${String(p.assetTag ?? "")}`;
      break;
    case "access.granted":
      title = `Acesso liberado: ${String(p.system ?? "")}`;
      break;
    case "stage.completed":
      title = `Etapa concluída: ${String(p.title ?? p.stageId ?? "")}`;
      break;
    case "task.completed":
      title = String(p.title ?? "Tarefa concluída");
      detail = str(p.detail);
      break;
    case "feedback.submitted":
      detail = p.nps !== undefined ? `Nota ${String(p.nps)}` : undefined;
      break;
    case "case.completed":
      detail = typeof p.leadTimeDays === "number" ? `Lead time de ${(Math.round(p.leadTimeDays * 10) / 10).toLocaleString("pt-BR")} dias` : undefined;
      break;
    case "sensitive.revealed":
      title = `Dado sensível exibido: ${String(p.label ?? p.field ?? "")}`;
      detail = `Por ${actor}`;
      break;
    case "policy.version_published":
      title = `Nova versão publicada: ${String(p.title ?? "")} v${String(p.version ?? "")}`;
      detail = str(p.changelog);
      break;
    case "policy.reack_required":
      title = `Re-aceite pendente criado: ${String(p.title ?? "")} v${String(p.version ?? "")}`;
      detail = p.people ? `${String(p.people)} pessoas` : undefined;
      break;
    case "benefit.provider_changed":
      title = `Benefício de ${String(p.categoryLabel ?? "")}: ${String(p.previousProvider ?? "—")} para ${String(p.newProvider ?? "")}`;
      break;
    case "assistant.reindexed":
      title = "Assistente reindexado com o conteúdo novo";
      break;
    case "rule.toggled":
      title = `${p.enabled ? "Regra ligada" : "Regra desligada"}: ${String(p.ruleId ?? "")} ${String(p.name ?? "")}`;
      break;
    case "demo.day_advanced":
      title = `Data virtual avançada para ${String(p.date ?? "")}`;
      break;
    case "content.updated":
      title = `Conteúdo atualizado: ${String(p.what ?? "")}`;
      detail = str(p.title);
      break;
    case "quiz.extra_attempt":
      title = "Nova tentativa de quiz liberada pelo RH";
      break;
  }

  return {
    id: e.id,
    at: e.at,
    type: e.type,
    title,
    detail,
    automated: e.actorId === AUTOMATION_ACTOR,
    actorName: actor,
    ruleId: e.ruleId,
    caseId: e.caseId,
    personId: e.personId,
  };
}
