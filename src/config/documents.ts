/**
 * Documentos por regime (seção 7.5). Formatos PDF, JPG e PNG, até 10 MB. Lista final a validar
 * (seção 17, item 2).
 */
import type { DocumentRequirement, Regime } from "@/domain/schemas";

const PDF_IMG = ["application/pdf", "image/jpeg", "image/png"];

export const REJECTION_REASONS = [
  "Ilegível",
  "Documento vencido",
  "Documento diferente do solicitado",
  "Dados divergentes da ficha",
  "Outro",
] as const;

export const documentRequirements: DocumentRequirement[] = [
  {
    id: "identidade",
    title: "Documento de identidade com foto (RG ou CNH)",
    description: "Frente e verso no mesmo arquivo, com foto e número legíveis.",
    regimes: ["PJ", "CLT"],
    requirement: { PJ: "obrigatorio", CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "cpf",
    title: "CPF",
    description: "Cartão ou comprovante de situação cadastral.",
    regimes: ["PJ", "CLT"],
    requirement: { PJ: "condicional", CLT: "condicional" },
    conditionNote: "Só se o número não constar no documento de identidade.",
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "residencia",
    title: "Comprovante de residência",
    description: "Conta de consumo ou extrato em seu nome, emitido nos últimos 3 meses.",
    regimes: ["PJ", "CLT"],
    requirement: { PJ: "obrigatorio", CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "cartao-cnpj",
    title: "Cartão CNPJ",
    description: "Comprovante de inscrição e situação cadastral emitido no site da Receita Federal.",
    regimes: ["PJ"],
    requirement: { PJ: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "contrato-social",
    title: "Contrato social ou documento de constituição da empresa",
    description: "Contrato social, requerimento de empresário ou certificado de MEI.",
    regimes: ["PJ"],
    requirement: { PJ: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "comprovante-conta-pj",
    title: "Comprovante da conta PJ ou da chave PIX",
    description: "Tela do banco com titular, agência e conta, ou com a chave PIX da PJ.",
    regimes: ["PJ"],
    requirement: { PJ: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "ctps",
    title: "Carteira de Trabalho Digital",
    description: "Tela do aplicativo com seus dados e o número da carteira.",
    regimes: ["CLT"],
    requirement: { CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "pis",
    title: "Comprovante de PIS/PASEP/NIT",
    description: "Pode ser a tela da Carteira de Trabalho Digital ou do app Caixa Tem.",
    regimes: ["CLT"],
    requirement: { CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "titulo-eleitor",
    title: "Título de eleitor",
    description: "Título impresso ou tela do e-Título.",
    regimes: ["CLT"],
    requirement: { CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "reservista",
    title: "Certificado de reservista",
    description: "Certificado de dispensa ou de reservista.",
    regimes: ["CLT"],
    requirement: { CLT: "condicional" },
    conditionNote: "Quando aplicável.",
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "escolaridade",
    title: "Comprovante de escolaridade",
    description: "Diploma ou certificado de conclusão do nível mais alto.",
    regimes: ["PJ", "CLT"],
    requirement: { PJ: "opcional", CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "certidao",
    title: "Certidão de nascimento ou casamento",
    description: "A certidão mais recente do seu estado civil.",
    regimes: ["CLT"],
    requirement: { CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "dependentes-docs",
    title: "Documentos dos dependentes",
    description: "Certidão de nascimento ou casamento e CPF de cada dependente.",
    regimes: ["CLT"],
    requirement: { CLT: "condicional" },
    conditionNote: "Se houver dependentes.",
    accept: PDF_IMG,
    maxSizeMb: 10,
  },
  {
    id: "foto-perfil",
    title: "Foto para o perfil",
    description: "Uma foto de rosto, usada no \"Quem é quem\".",
    regimes: ["PJ", "CLT"],
    requirement: { PJ: "opcional", CLT: "opcional" },
    accept: ["image/jpeg", "image/png"],
    maxSizeMb: 10,
  },
  {
    id: "aso",
    title: "ASO — atestado de saúde ocupacional",
    description: "Entregue pela clínica depois do exame admissional.",
    regimes: ["CLT"],
    requirement: { CLT: "obrigatorio" },
    accept: PDF_IMG,
    maxSizeMb: 10,
    taskOnly: true,
  },
];

/** Exigências da lista geral de documentos de um regime (sem as pedidas por tarefa). */
export function requirementsFor(regime: Regime): DocumentRequirement[] {
  return documentRequirements.filter((d) => d.regimes.includes(regime) && !d.taskOnly);
}

export function requiredFor(regime: Regime): DocumentRequirement[] {
  return requirementsFor(regime).filter((d) => d.requirement[regime] === "obrigatorio");
}

export function requirementById(id: string): DocumentRequirement | undefined {
  return documentRequirements.find((d) => d.id === id);
}

export const ACCEPT_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};
