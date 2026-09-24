/**
 * Configuração da empresa e do produto. Nada aqui é regra oficial da Monoda: itens marcados
 * com `toValidate` dependem de confirmação (ver docs/PLANO.md, seção 17).
 */
export const company = {
  /** Nome de trabalho do produto (configurável). */
  productName: "Monoda People",
  companyName: "Monoda Consulting",
  shortName: "Monoda",
  locale: "pt-BR",
  timeZone: "America/Sao_Paulo",

  /** Domínio usado nos e-mails da equipe e no e-mail corporativo. Validar (seção 17, item 9). */
  emailDomain: "exemplo.monoda",
  emailDomainToValidate: true,
  /** Caixa de onde saem os disparos automáticos (Gmail API na Fase 1). Validar. */
  senderEmail: "pessoas@exemplo.monoda",
  senderName: "Monoda People",

  /** Contato de RH exibido para quem entra e usado como padrão de encaminhamento. */
  rhContactPersonId: "thiago-stepanoff",
  /** Responsável pelas tarefas de TI enquanto não houver TI dedicada. */
  tiContactPersonId: "thiago-stepanoff",
  /** Para onde o assistente encaminha quando nenhum tema do "Quem é quem" corresponde. */
  defaultRoutingPersonId: "thiago-stepanoff",
  /** Canal padrão de contato. Validar (seção 17, item 11). */
  defaultChannel: "chat da equipe",

  /** Ferramenta de despesas: trocar o VExpenses por outra solução é editar este bloco. */
  expenseTool: {
    name: "VExpenses",
    url: "https://vexpenses.com",
    urlToValidate: true,
    /** Artigo da base de conhecimento com o passo a passo de lançamento. */
    howToArticleId: "como-lancar-despesa",
    tutorials: [
      { id: "lancar-despesa", title: "Como lançar uma despesa pelo celular", durationSec: 180, url: undefined },
      { id: "prestar-contas", title: "Como montar e enviar um relatório de despesas", durationSec: 240, url: undefined },
    ] as { id: string; title: string; durationSec: number; url?: string }[],
    reimbursementsComingSoon: "Meus reembolsos — em breve, pelo ERP Monoda",
  },

  /** Links úteis mostrados no primeiro dia. */
  usefulLinks: [
    { id: "despesas", label: "VExpenses (despesas e reembolsos)", url: "https://vexpenses.com" },
    { id: "agenda", label: "Agenda (Google Calendar)", url: "https://calendar.google.com" },
    { id: "drive", label: "Drive da equipe (Google Drive)", url: "https://drive.google.com" },
  ],

  /** Sistemas liberados no onboarding (a conta Google Workspace é a tarefa de e-mail corporativo). */
  accessSystems: [
    { id: "microsoft-365", name: "Microsoft 365", owner: "ti" },
    { id: "vexpenses", name: "VExpenses", owner: "rh" },
    { id: "drive-projeto", name: "Pasta do projeto no Drive", owner: "gestor" },
  ] as { id: string; name: string; owner: "rh" | "ti" | "gestor" }[],
} as const;

export type CompanyConfig = typeof company;
