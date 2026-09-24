/**
 * Mascaramento de dados pessoais na pergunta e no histórico, antes de qualquer processamento
 * (seção 10.2, item 1): CPF, CNPJ, e-mail e telefone. A ordem importa: e-mail primeiro (pode ter
 * dígitos), depois CNPJ (14 dígitos), CPF (11) e telefone.
 */
const PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "[e-mail]", pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { label: "[CNPJ]", pattern: /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g },
  { label: "[CPF]", pattern: /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g },
  // +55 11 98765-4321 · (11) 98765-4321 · 11 98765-4321 · 98765-4321 · 3456-7890
  {
    label: "[telefone]",
    pattern: /(?<![\d/])(?:\+?55[\s-]?)?(?:\(\d{2}\)\s?|\d{2}[\s-])?9?\d{4}[\s-]\d{4}(?![\d/])/g,
  },
  // 10 dígitos seguidos (DDD + fixo)
  { label: "[telefone]", pattern: /(?<!\d)\d{10}(?!\d)/g },
];

export function redactSensitive(text: string): string {
  return PATTERNS.reduce((acc, { label, pattern }) => acc.replace(pattern, label), text);
}

/** Verdadeiro se o texto tinha algo a mascarar. */
export function hasSensitiveData(text: string): boolean {
  return redactSensitive(text) !== text;
}
