import type { FieldDef, FormSection } from "@/domain/schemas";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const personalSection: FormSection = {
  id: "dados-pessoais",
  title: "Dados pessoais",
  fields: [
    { id: "nomeCompleto", label: "Nome completo", type: "text", required: true, prefillFrom: "name" },
    { id: "nomeSocial", label: "Nome social", type: "text", required: false, helpText: "Opcional. É como vamos chamar você no dia a dia." },
    { id: "dataNascimento", label: "Data de nascimento", type: "date", required: true },
    { id: "cpf", label: "CPF", type: "cpf", required: true, sensitive: true, placeholder: "000.000.000-00" },
    { id: "rgNumero", label: "RG", type: "text", required: true, sensitive: true },
    { id: "rgOrgao", label: "Órgão emissor do RG", type: "text", required: true, placeholder: "SSP" },
    { id: "rgUf", label: "UF do RG", type: "select", required: true, options: UFS },
    {
      id: "estadoCivil",
      label: "Estado civil",
      type: "select",
      required: true,
      options: ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"],
    },
    { id: "nacionalidade", label: "Nacionalidade", type: "text", required: true, placeholder: "Brasileira" },
    { id: "celular", label: "Celular", type: "tel", required: true, prefillFrom: "phone", placeholder: "(11) 90000-0000" },
    { id: "emailPessoal", label: "E-mail pessoal", type: "email", required: true, prefillFrom: "personalEmail" },
  ],
};

export const addressSection: FormSection = {
  id: "endereco",
  title: "Endereço",
  fields: [
    { id: "cep", label: "CEP", type: "cep", required: true, placeholder: "00000-000" },
    { id: "logradouro", label: "Logradouro", type: "text", required: true },
    { id: "numero", label: "Número", type: "text", required: true },
    { id: "complemento", label: "Complemento", type: "text", required: false },
    { id: "bairro", label: "Bairro", type: "text", required: true },
    { id: "cidade", label: "Cidade", type: "text", required: true },
    { id: "uf", label: "UF", type: "select", required: true, options: UFS },
  ],
};

export const emergencySection: FormSection = {
  id: "emergencia",
  title: "Contato de emergência",
  fields: [
    { id: "emergenciaNome", label: "Nome", type: "text", required: true },
    { id: "emergenciaParentesco", label: "Parentesco", type: "text", required: true, placeholder: "Mãe, cônjuge, irmão…" },
    { id: "emergenciaTelefone", label: "Telefone", type: "tel", required: true, placeholder: "(11) 90000-0000" },
  ],
};

export const privacySection: FormSection = {
  id: "privacidade",
  title: "Privacidade",
  description: "Seus dados ficam só com o RH e são usados para a sua admissão.",
  fields: [
    {
      id: "aceitePrivacidade",
      label: "Li e aceito o Aviso de Privacidade",
      type: "checkbox",
      required: true,
      helpText: "O aceite fica registrado com data e hora.",
    },
  ],
};

export const bankFields = (prefix: string, showWhen?: FieldDef["showWhen"]): FieldDef[] => [
  { id: `${prefix}Banco`, label: "Banco", type: "text", required: true, sensitive: true, ...(showWhen ? { showWhen } : {}) },
  { id: `${prefix}Agencia`, label: "Agência", type: "text", required: true, sensitive: true, ...(showWhen ? { showWhen } : {}) },
  { id: `${prefix}Conta`, label: "Conta", type: "text", required: true, sensitive: true, ...(showWhen ? { showWhen } : {}) },
];
