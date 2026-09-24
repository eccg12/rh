/**
 * Validação da ficha cadastral gerada pelo schema do regime (seção 7.4). Função pura, usada no
 * formulário (retorno imediato) e no servidor (fonte da verdade). Fase 0: obrigatoriedade e
 * formato; dígito verificador de CPF/CNPJ entra na Fase 1.
 */
import type { FieldDef, FormSchema } from "./schemas";

export type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string>;

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function isFieldVisible(field: FieldDef, values: FormValues): boolean {
  if (!field.showWhen) return true;
  return values[field.showWhen.fieldId] === field.showWhen.equals;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function validateField(field: FieldDef, value: unknown): string | undefined {
  if (field.type === "checkbox") {
    return field.required && value !== true ? "Marque para continuar." : undefined;
  }
  if (field.type === "repeater") {
    const items = Array.isArray(value) ? (value as FormValues[]) : [];
    if (field.required && items.length === 0) return "Adicione pelo menos um item.";
    for (const item of items) {
      for (const sub of field.fields ?? []) {
        const err = validateField(sub, item?.[sub.id]);
        if (err) return `${sub.label}: ${err}`;
      }
    }
    return undefined;
  }
  if (isEmpty(value)) return field.required ? "Campo obrigatório." : undefined;
  const text = String(value).trim();
  switch (field.type) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? undefined : "E-mail inválido.";
    case "cpf":
      return digits(text).length === 11 ? undefined : "O CPF tem 11 números.";
    case "cnpj":
      return digits(text).length === 14 ? undefined : "O CNPJ tem 14 números.";
    case "cep":
      return digits(text).length === 8 ? undefined : "O CEP tem 8 números.";
    case "tel": {
      const n = digits(text).length;
      return n === 10 || n === 11 ? undefined : "Informe DDD e número.";
    }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) ? undefined : "Data inválida.";
    case "select":
    case "radio":
      return field.options && !field.options.includes(text) ? "Escolha uma das opções." : undefined;
    default:
      return undefined;
  }
}

export function validateForm(schema: FormSchema, values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!isFieldVisible(field, values)) continue;
      const err = validateField(field, values[field.id]);
      if (err) errors[field.id] = err;
    }
  }
  return errors;
}

/** Remove valores de campos ocultos (ex.: dados bancários quando a escolha foi PIX). */
export function visibleValues(schema: FormSchema, values: FormValues): FormValues {
  const out: FormValues = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (isFieldVisible(field, values) && values[field.id] !== undefined) out[field.id] = values[field.id];
    }
  }
  return out;
}
