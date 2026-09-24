/** Formatação de nomes, números e dados sensíveis para exibição. */

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const integerFmt = new Intl.NumberFormat("pt-BR");
export function formatInt(n: number): string {
  return integerFmt.format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/** "2 pessoas", "1 pessoa". */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${formatInt(n)} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(mb)} MB`;
}

// ---------------------------------------------------------------------------------------------
// Máscaras de entrada e mascaramento de exibição
// ---------------------------------------------------------------------------------------------

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CPF mascarado para listas: "•••.•••.789-00" (só os 5 últimos dígitos visíveis). */
export function maskCpf(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 11) return maskGeneric(value);
  return `•••.•••.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CNPJ mascarado: "••.•••.•••/0001-00". */
export function maskCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 14) return maskGeneric(value);
  return `••.•••.•••/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** E-mail mascarado para toasts: "ana…@…" (seção 9.2). */
export function maskEmailShort(email: string): string {
  const [local = ""] = email.split("@");
  return `${local.slice(0, 3)}…@…`;
}

/** E-mail mascarado com domínio: "an•••@pessoal.example". */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** Máscara genérica: mantém os 2 últimos caracteres. */
export function maskGeneric(value: string): string {
  const s = String(value);
  if (s.length <= 2) return "••";
  return `${"•".repeat(Math.min(8, s.length - 2))}${s.slice(-2)}`;
}
