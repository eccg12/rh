/**
 * Dados de exemplo para a ficha (seed e atalho "Preencher com dados de exemplo"). Tudo fictício:
 * CPF e CNPJ com dígito verificador propositalmente inválido, para nunca coincidir com documento
 * real (D-OB-20).
 */
import { PIX_OPTION } from "@/config/forms/ficha-pj";

import type { FormValues } from "./forms";
import type { Person, Regime } from "./schemas";

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], seed: number, offset = 0): T {
  return list[(seed + offset) % list.length]!;
}

function digitsFrom(seed: number, count: number): string {
  let out = "";
  let x = seed || 1;
  while (out.length < count) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    out += String(x % 10);
  }
  return out;
}

/** Dígitos verificadores do CPF (algoritmo oficial), usado só para garantir que o nosso é inválido. */
export function cpfCheckDigits(base9: string): string {
  const calc = (s: string, weight: number) => {
    const sum = s.split("").reduce((acc, d, i) => acc + Number(d) * (weight - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(base9, 10);
  const d2 = calc(base9 + String(d1), 11);
  return `${d1}${d2}`;
}

export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  return cpfCheckDigits(d.slice(0, 9)) === d.slice(9);
}

export function cnpjCheckDigits(base12: string): string {
  const calc = (s: string) => {
    const weights = s.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = s.split("").reduce((acc, d, i) => acc + Number(d) * weights[i]!, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12);
  const d2 = calc(base12 + String(d1));
  return `${d1}${d2}`;
}

export function isValidCnpj(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  return cnpjCheckDigits(d.slice(0, 12)) === d.slice(12);
}

/** CPF de teste: formato correto, dígitos verificadores errados de propósito. */
export function fakeCpf(seedText: string): string {
  const base = digitsFrom(hash(seedText), 9);
  const right = cpfCheckDigits(base);
  const wrong = String((Number(right) + 11) % 100).padStart(2, "0");
  return base + (wrong === right ? "00" : wrong);
}

export function fakeCnpj(seedText: string): string {
  const base = digitsFrom(hash(seedText + "cnpj"), 8) + "0001";
  const right = cnpjCheckDigits(base);
  const wrong = String((Number(right) + 13) % 100).padStart(2, "0");
  return base + (wrong === right ? "00" : wrong);
}

const STREETS = ["Rua das Acácias", "Rua dos Ipês", "Avenida das Palmeiras", "Rua Sete de Setembro", "Rua das Hortênsias", "Alameda dos Jacarandás"];
const DISTRICTS = ["Vila Mariana", "Pinheiros", "Moema", "Perdizes", "Santana", "Tatuapé"];
const EMERGENCY = ["Maria", "José", "Helena", "Paulo", "Lúcia", "Carlos"];
const RELATION = ["Mãe", "Pai", "Cônjuge", "Irmã", "Irmão"];

export function sampleFormValues(
  regime: Regime,
  person: Pick<Person, "name" | "personalEmail" | "phone">,
  overrides: FormValues = {},
): FormValues {
  const seed = hash(person.name);
  const surname = person.name.trim().split(/\s+/).at(-1) ?? "Silva";
  const common: FormValues = {
    nomeCompleto: person.name,
    nomeSocial: "",
    dataNascimento: `199${seed % 9}-0${(seed % 9) + 1}-1${seed % 9}`,
    cpf: fakeCpf(person.name),
    rgNumero: digitsFrom(seed + 7, 9),
    rgOrgao: "SSP",
    rgUf: "SP",
    estadoCivil: pick(["Solteiro(a)", "Casado(a)", "União estável"], seed),
    nacionalidade: "Brasileira",
    celular: person.phone ?? "(11) 90000-0000",
    emailPessoal: person.personalEmail,
    cep: `0${digitsFrom(seed + 3, 4)}-000`,
    logradouro: pick(STREETS, seed),
    numero: String(40 + (seed % 900)),
    complemento: seed % 2 ? `Apto ${10 + (seed % 90)}` : "",
    bairro: pick(DISTRICTS, seed),
    cidade: "São Paulo",
    uf: "SP",
    emergenciaNome: `${pick(EMERGENCY, seed, 2)} ${surname}`,
    emergenciaParentesco: pick(RELATION, seed),
    emergenciaTelefone: `(11) 9${digitsFrom(seed + 11, 4)}-${digitsFrom(seed + 13, 4)}`,
    aceitePrivacidade: true,
  };
  if (regime === "PJ") {
    const cnpj = fakeCnpj(person.name);
    return {
      ...common,
      cnpj,
      razaoSocial: `${person.name} Consultoria Ltda.`,
      nomeFantasia: "",
      inscricaoMunicipal: digitsFrom(seed + 17, 8),
      municipioEmpresa: "São Paulo",
      regimeTributario: "Simples Nacional",
      formaPagamento: PIX_OPTION,
      chavePix: cnpj,
      ...overrides,
    };
  }
  return {
    ...common,
    pis: digitsFrom(seed + 19, 11),
    tituloEleitor: digitsFrom(seed + 23, 12),
    reservista: "",
    escolaridade: "Superior completo",
    dependentes: [],
    salarioBanco: "Banco de exemplo (000)",
    salarioAgencia: digitsFrom(seed + 29, 4),
    salarioConta: `${digitsFrom(seed + 31, 6)}-${seed % 10}`,
    optanteVT: "Sim",
    trajetoVT: "Metrô Linha 1 até a estação Paraíso e ônibus até o escritório.",
    ...overrides,
  };
}
