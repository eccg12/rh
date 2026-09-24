/** Textos da jornada de quem entra (seção 12.8: você, voz ativa, sem enchimento). */
import { formatMinutes } from "@/lib/dates";

export function startSentence(days: number): string {
  if (days > 1) return `Faltam ${days} dias para o seu início.`;
  if (days === 1) return "Falta 1 dia para o seu início.";
  if (days === 0) return "Hoje é o seu primeiro dia.";
  return days === -1 ? "Você começou ontem." : `Você começou há ${-days} dias.`;
}

/** "Uns 10 minutos." */
export function minutesSentence(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `Uns ${formatMinutes(minutes)}.`;
  return `Cerca de ${formatMinutes(minutes)}.`;
}

export const STAGE_BLOCKED_HINT: Record<string, string> = {
  "pre-admissao": "O RH cuida desta etapa.",
  "cadastro-documentos": "A ficha e os documentos são liberados junto com as boas-vindas.",
  contrato: "O RH prepara o contrato depois que todos os seus documentos forem aprovados. Você recebe um e-mail quando ele estiver pronto.",
  compliance: "O treinamento é liberado assim que você enviar todos os documentos obrigatórios.",
  "politicas-beneficios": "As políticas e os benefícios são liberados depois do quiz de compliance.",
  "equipamentos-acessos": "E-mail corporativo, notebook e acessos são preparados depois da assinatura do contrato.",
  "primeiro-dia": "A agenda do primeiro dia é liberada depois da assinatura do contrato.",
  feedback: "A pesquisa abre depois do check-in do primeiro dia.",
};
