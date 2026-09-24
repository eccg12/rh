/** Áreas do Admin (seção 9.10). */
export type AdminSectionId =
  | "caixa-de-saida"
  | "automacoes"
  | "fluxos"
  | "politicas"
  | "beneficios"
  | "compliance"
  | "base-de-conhecimento"
  | "quem-e-quem"
  | "pesquisa"
  | "auditoria"
  | "demo";

export interface AdminSection {
  id: AdminSectionId;
  title: string;
  description: string;
  icon:
    | "Inbox"
    | "Zap"
    | "Workflow"
    | "ScrollText"
    | "HeartPulse"
    | "ShieldCheck"
    | "BookOpen"
    | "Users"
    | "MessageSquare"
    | "History"
    | "FlaskConical";
  demoOnly?: boolean;
}

export const adminSections: AdminSection[] = [
  { id: "caixa-de-saida", title: "Caixa de saída", description: "Todos os e-mails que a plataforma enviou (simulados).", icon: "Inbox" },
  { id: "automacoes", title: "Automações", description: "Regras de aviso automático: ligar, desligar e ver disparos.", icon: "Zap" },
  { id: "fluxos", title: "Fluxos", description: "Etapas, tarefas, donos e condições dos fluxos PJ e CLT.", icon: "Workflow" },
  { id: "politicas", title: "Políticas", description: "Versões vigentes e publicação de nova versão.", icon: "ScrollText" },
  { id: "beneficios", title: "Benefícios", description: "Provedor ativo, histórico e troca de provedor.", icon: "HeartPulse" },
  { id: "compliance", title: "Compliance", description: "Vídeo, perguntas do quiz, nota mínima e tentativas.", icon: "ShieldCheck" },
  { id: "base-de-conhecimento", title: "Base de conhecimento", description: "Artigos do assistente e lacunas da base.", icon: "BookOpen" },
  { id: "quem-e-quem", title: "Quem é quem", description: "Pessoas, temas e canal de contato.", icon: "Users" },
  { id: "pesquisa", title: "Pesquisa de onboarding", description: "Respostas e média das notas.", icon: "MessageSquare" },
  { id: "auditoria", title: "Auditoria", description: "Todos os eventos, com filtros e exportação.", icon: "History" },
  { id: "demo", title: "Dados da demo", description: "Data virtual, avançar dias e restaurar os dados iniciais.", icon: "FlaskConical", demoOnly: true },
];

export function adminSection(id: AdminSectionId): AdminSection {
  const s = adminSections.find((x) => x.id === id);
  if (!s) throw new Error(`Área do Admin desconhecida: ${id}`);
  return s;
}
