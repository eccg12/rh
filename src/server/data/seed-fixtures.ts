/**
 * Pessoas do seed (seção 11). A equipe Monoda aparece só como persona de demo e no "Quem é quem";
 * os e-mails usam o domínio de exemplo de company.ts (validar). New joiners são fictícios: e-mails no
 * domínio reservado `.example`; os dados da ficha saem de src/domain/samples.ts, com CPF e CNPJ de
 * dígito verificador propositalmente inválido (D-OB-20).
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
  },
];
