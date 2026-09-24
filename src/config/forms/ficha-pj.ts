/** Ficha cadastral PJ (seção 7.4). Lista final a validar com o RH (seção 17, item 2). */
import type { FormSchema } from "@/domain/schemas";

import { addressSection, bankFields, emergencySection, personalSection, privacySection } from "./common";

export const PIX_OPTION = "Chave PIX da PJ (preferencial)";
export const BANK_OPTION = "Conta bancária da PJ";

export const fichaPj: FormSchema = {
  id: "ficha-pj",
  regime: "PJ",
  title: "Ficha cadastral PJ",
  sections: [
    personalSection,
    addressSection,
    {
      id: "empresa",
      title: "Empresa",
      description: "Dados da pessoa jurídica que vai prestar os serviços.",
      fields: [
        { id: "cnpj", label: "CNPJ", type: "cnpj", required: true, sensitive: true, placeholder: "00.000.000/0000-00" },
        { id: "razaoSocial", label: "Razão social", type: "text", required: true },
        { id: "nomeFantasia", label: "Nome fantasia", type: "text", required: false },
        { id: "inscricaoMunicipal", label: "Inscrição municipal", type: "text", required: true },
        { id: "municipioEmpresa", label: "Município da empresa", type: "text", required: true },
        {
          id: "regimeTributario",
          label: "Regime tributário",
          type: "radio",
          required: true,
          options: ["Simples Nacional", "Lucro Presumido", "Outro"],
        },
      ],
    },
    {
      id: "pagamento",
      title: "Pagamento",
      description: "Conta de titularidade da PJ.",
      fields: [
        { id: "formaPagamento", label: "Como prefere receber", type: "radio", required: true, options: [PIX_OPTION, BANK_OPTION] },
        {
          id: "chavePix",
          label: "Chave PIX da PJ",
          type: "text",
          required: true,
          sensitive: true,
          showWhen: { fieldId: "formaPagamento", equals: PIX_OPTION },
        },
        ...bankFields("pj", { fieldId: "formaPagamento", equals: BANK_OPTION }),
      ],
    },
    emergencySection,
    privacySection,
  ],
};
