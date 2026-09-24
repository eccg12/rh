/**
 * Datas no fuso de São Paulo. Timestamps são ISO (UTC); datas sem hora são chaves `YYYY-MM-DD` no
 * calendário de São Paulo. Toda conta de "há X dias" e "em X dias" usa dias de calendário.
 * O "agora" vem sempre de fora (clock.now() no servidor), nunca de `new Date()` aqui.
 */

export const TIME_ZONE = "America/Sao_Paulo";
const MS_PER_DAY = 86_400_000;

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Chave de data (`YYYY-MM-DD`) no calendário de São Paulo. */
export function spDateKey(value: Date | string): string {
  return keyFormatter.format(toDate(value));
}

/** Hora local de São Paulo (0–23). */
export function spHour(value: Date | string): number {
  const parts = partsFormatter.formatToParts(toDate(value));
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function keyToUtcMidnight(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function utcMidnightToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Soma dias a uma chave de data. */
export function addDaysKey(key: string, days: number): string {
  return utcMidnightToKey(keyToUtcMidnight(key) + days * MS_PER_DAY);
}

/** Dias de calendário de `from` até `to` (positivo se `to` é depois). */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((keyToUtcMidnight(to) - keyToUtcMidnight(from)) / MS_PER_DAY);
}

/** Dia da semana da chave (0 = domingo). */
export function weekdayOfKey(key: string): number {
  return new Date(keyToUtcMidnight(key)).getUTCDay();
}

/** Segunda-feira da semana da chave. */
export function mondayOfKey(key: string): string {
  const wd = weekdayOfKey(key);
  const delta = wd === 0 ? -6 : 1 - wd;
  return addDaysKey(key, delta);
}

/**
 * Timestamp ISO de uma data/hora de parede em São Paulo (UTC−3; o Brasil não tem horário de verão
 * desde 2019). Usado pelo seed para marcar eventos "às 9h".
 */
export function spDateTimeToIso(key: string, hour: number, minute = 0): string {
  const ms = keyToUtcMidnight(key) + ((hour + 3) * 60 + minute) * 60_000;
  return new Date(ms).toISOString();
}

// ---------------------------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const longFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const weekdayLongFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDayFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
});

/** "24/09/2026" (timestamp ou chave de data). */
export function formatDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFmt.format(toDate(value));
}

/** "24/09/2026 14:32" no fuso de São Paulo. */
export function formatDateTime(value: Date | string): string {
  return dateTimeFmt.format(toDate(value)).replace(",", "");
}

/** "14:32" no fuso de São Paulo. */
export function formatTime(value: Date | string): string {
  return timeFmt.format(toDate(value));
}

/** "24 de setembro de 2026" a partir de uma chave de data. */
export function formatDateLong(key: string): string {
  return longFmt.format(new Date(keyToUtcMidnight(key)));
}

/** "quinta-feira, 24 de setembro" a partir de uma chave de data. */
export function formatWeekdayDate(key: string): string {
  return weekdayLongFmt.format(new Date(keyToUtcMidnight(key)));
}

/** "24/09" a partir de uma chave de data. */
export function formatShortDay(key: string): string {
  return shortDayFmt.format(new Date(keyToUtcMidnight(key)));
}

/** "hoje", "ontem", "há 3 dias" — dias de calendário entre o evento e agora. */
export function formatAgo(value: Date | string, now: Date | string): string {
  const days = daysBetweenKeys(spDateKey(value), spDateKey(now));
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

/** "em 14 dias", "amanhã", "hoje", "há 5 dias" para uma data futura ou passada. */
export function formatUntil(key: string, now: Date | string): string {
  const days = daysBetweenKeys(spDateKey(now), key);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days > 1) return `em ${days} dias`;
  if (days === -1) return "ontem";
  return `há ${Math.abs(days)} dias`;
}

const decimalFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** "4,2 dias", "0,5 dia", "1 dia". */
export function formatDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return `${decimalFmt.format(rounded)} ${Math.abs(rounded) < 2 ? "dia" : "dias"}`;
}

/** Duração legível: "menos de 1 hora", "7 horas", "1,5 dia", "4,2 dias". */
export function formatDuration(days: number): string {
  if (days < 1 / 24) return "menos de 1 hora";
  if (days < 1) {
    const h = Math.round(days * 24);
    return `${h} ${h === 1 ? "hora" : "horas"}`;
  }
  return formatDays(days);
}

/** "10 minutos", "1 hora", "1 hora e 15 minutos". */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} ${h === 1 ? "hora" : "horas"}`;
  return m === 0 ? hours : `${hours} e ${m} ${m === 1 ? "minuto" : "minutos"}`;
}
