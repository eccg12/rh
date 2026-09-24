/**
 * Pessoas do seed (seção 11). A equipe Monoda aparece só como persona de demo e no "Quem é quem";
 * os e-mails usam o domínio de exemplo de company.ts (validar). New joiners são fictícios: e-mails no
 * domínio reservado `.example` e CPF/CNPJ com dígito verificador propositalmente inválido, para nunca
 * coincidir com um documento real (D-OB-20).
 */
import type { Regime, Role } from "@/domain/schemas";

export interface TeamFixture {
  id: string;
  name: string;
  roles: Role[];
  emailLocal: string;
  /** Aparece no seletor "Ver como" (seção 5). */
  persona: boolean;
}

export const TEAM: TeamFixture[] = [
  { id: "thiago-stepanoff", name: "Thiago Stepanoff", roles: ["ADMIN_RH", "GESTOR"], emailLocal: "thiago.stepanoff", persona: true },
  { id: "enzo-craveiro", name: "Enzo Craveiro", roles: ["COLABORADOR", "GESTOR"], emailLocal: "enzo.craveiro", persona: true },
  { id: "guilherme-bonfitto", name: "Guilherme Bonfitto", roles: ["COLABORADOR", "GESTOR"], emailLocal: "guilherme.bonfitto", persona: false },
  { id: "alessandro-benetti", name: "Alessandro Benetti", roles: ["COLABORADOR", "GESTOR"], emailLocal: "alessandro.benetti", persona: false },
];

export type NewJoinerScenario =
  | "recem-cadastrado"
  | "contrato-enviado"
  | "equipamentos"
  | "clt-documentos"
  | "concluido-marina"
  | "concluido-carolina";

export interface NewJoinerFixture {
  id: string;
  name: string;
  regime: Regime;
  jobTitle: string;
  /** Início relativo à data virtual (dias). */
  startOffsetDays: number;
  managerId: string;
  initialProjectId?: string;
  needsNotebook: boolean;
  personalEmail: string;
  phone: string;
  scenario: NewJoinerScenario;
  /** Dados fictícios para a ficha (CPF/CNPJ inválidos de propósito). */
  sample: {
    birthDate: string;
    cpf: string;
    rg: string;
    cnpj?: string;
    companyName?: string;
    city: string;
  };
}

export const NEW_JOINERS: NewJoinerFixture[] = [
  {
    id: "bruno-almeida",
    name: "Bruno Almeida",
    regime: "PJ",
    jobTitle: "Analista",
    startOffsetDays: 20,
    managerId: "alessandro-benetti",
    needsNotebook: true,
    personalEmail: "bruno.almeida@pessoal.example",
    phone: "(11) 90000-0101",
    scenario: "recem-cadastrado",
    sample: { birthDate: "1998-03-14", cpf: "31641218700", rg: "401234567", cnpj: "40111222000100", companyName: "Bruno Almeida Consultoria Ltda.", city: "São Paulo" },
  },
  {
    id: "rafael-nogueira",
    name: "Rafael Nogueira",
    regime: "PJ",
    jobTitle: "Analista",
    startOffsetDays: 7,
    managerId: "guilherme-bonfitto",
    initialProjectId: "cliente-a-manutencao",
    needsNotebook: true,
    personalEmail: "rafael.nogueira@pessoal.example",
    phone: "(11) 90000-0102",
    scenario: "contrato-enviado",
    sample: { birthDate: "1997-08-02", cpf: "27458391600", rg: "389012345", cnpj: "40222333000100", companyName: "RN Serviços de Consultoria Ltda.", city: "São Paulo" },
  },
  {
    id: "juliana-prado",
    name: "Juliana Prado",
    regime: "PJ",
    jobTitle: "Consultora sênior",
    startOffsetDays: 3,
    managerId: "alessandro-benetti",
    initialProjectId: "cliente-b-sop",
    needsNotebook: true,
    personalEmail: "juliana.prado@pessoal.example",
    phone: "(11) 90000-0103",
    scenario: "equipamentos",
    sample: { birthDate: "1990-11-21", cpf: "19283746500", rg: "334455667", cnpj: "40333444000100", companyName: "Prado Consultoria em Gestão Ltda.", city: "Campinas" },
  },
  {
    id: "lucas-ferraz",
    name: "Lucas Ferraz",
    regime: "CLT",
    jobTitle: "Analista",
    startOffsetDays: 10,
    managerId: "guilherme-bonfitto",
    initialProjectId: "cliente-c-supply",
    needsNotebook: true,
    personalEmail: "lucas.ferraz@pessoal.example",
    phone: "(11) 90000-0104",
    scenario: "clt-documentos",
    sample: { birthDate: "2000-05-09", cpf: "50617283900", rg: "501122334", city: "São Paulo" },
  },
  {
    id: "marina-takeda",
    name: "Marina Takeda",
    regime: "PJ",
    jobTitle: "Consultora",
    startOffsetDays: -5,
    managerId: "alessandro-benetti",
    initialProjectId: "cliente-c-supply",
    needsNotebook: true,
    personalEmail: "marina.takeda@pessoal.example",
    phone: "(11) 90000-0105",
    scenario: "concluido-marina",
    sample: { birthDate: "1994-02-17", cpf: "44556677800", rg: "276655443", cnpj: "40444555000100", companyName: "Takeda Consultoria Ltda.", city: "São Paulo" },
  },
  {
    id: "carolina-reis",
    name: "Carolina Reis",
    regime: "PJ",
    jobTitle: "Gerente de projetos",
    startOffsetDays: -26,
    managerId: "guilherme-bonfitto",
    initialProjectId: "cliente-a-manutencao",
    needsNotebook: true,
    personalEmail: "carolina.reis@pessoal.example",
    phone: "(11) 90000-0106",
    scenario: "concluido-carolina",
    sample: { birthDate: "1987-07-30", cpf: "66778899000", rg: "198877665", cnpj: "40555666000100", companyName: "Reis Gestão de Projetos Ltda.", city: "Santo André" },
  },
];
