/**
 * Ficha cadastral CLT (seção 7.4). Lista final a validar com a contabilidade (exigências do eSocial).
 */
import type { FormSchema } from "@/domain/schemas";

import { addressSection, bankFields, emergencySection, personalSection, privacySection } from "./common";

export const fichaClt: FormSchema = {
  id: "ficha-clt",
  regime: "CLT",
  title: "Ficha cadastral CLT",
  note: "Lista em validação com a contabilidade (exigências do eSocial).",
  sections: [
    personalSection,
    addressSection,
    {
      id: "trabalhista",
      title: "Dados trabalhistas",
      fields: [
        { id: "pis", label: "PIS/PASEP/NIT", type: "text", required: true, sensitive: true },
        { id: "tituloEleitor", label: "Título de eleitor", type: "text", required: true, sensitive: true },
        { id: "reservista", label: "Certificado de reservista", type: "text", required: false, helpText: "Quando aplicável." },
        {
          id: "escolaridade",
          label: "Escolaridade",
          type: "select",
          required: true,
          options: [
            "Ensino médio completo",
            "Superior incompleto",
            "Superior completo",
            "Pós-graduação",
            "Mestrado",
            "Doutorado",
          ],
        },
      ],
    },
    {
      id: "dependentes",
      title: "Dependentes",
      description: "Opcional. Adicione quem é seu dependente para fins de benefícios e imposto.",
      fields: [
        {
          id: "dependentes",
          label: "Dependentes",
          type: "repeater",
          required: false,
          sensitive: true,
          fields: [
            { id: "nome", label: "Nome", type: "text", required: true },
            { id: "cpf", label: "CPF", type: "cpf", required: true, sensitive: true },
            { id: "dataNascimento", label: "Data de nascimento", type: "date", required: true },
            {
              id: "parentesco",
              label: "Parentesco",
              type: "select",
              required: true,
              options: ["Filho(a)", "Cônjuge", "Companheiro(a)", "Enteado(a)", "Outro"],
            },
          ],
        },
      ],
    },
    {
      id: "conta-salario",
      title: "Conta para salário",
      fields: bankFields("salario"),
    },
    {
      id: "vale-transporte",
      title: "Vale-transporte",
      fields: [
        { id: "optanteVT", label: "Quer receber vale-transporte?", type: "radio", required: true, options: ["Sim", "Não"] },
        {
          id: "trajetoVT",
          label: "Trajeto",
          type: "textarea",
          required: true,
          helpText: "Linhas e conduções de casa até o escritório.",
          showWhen: { fieldId: "optanteVT", equals: "Sim" },
        },
      ],
    },
    emergencySection,
    privacySection,
  ],
};
