/**
 * Relógio virtual (D-OB-09, seção 8.5). Todo "agora" do domínio vem daqui: hora real mais um
 * deslocamento em dias, guardado no repositório. "Avançar 1 dia" incrementa o deslocamento.
 */
import { spDateKey } from "@/lib/dates";

export const MS_PER_DAY = 86_400_000;

export interface Clock {
  now(): Date;
  nowIso(): string;
  /** Data de hoje (virtual) no calendário de São Paulo. */
  todayKey(): string;
}

abstract class BaseClock implements Clock {
  abstract now(): Date;
  nowIso(): string {
    return this.now().toISOString();
  }
  todayKey(): string {
    return spDateKey(this.now());
  }
}

/** Hora real + deslocamento em dias lido a cada chamada (o deslocamento vive no repositório). */
export class VirtualClock extends BaseClock {
  constructor(
    private readonly offsetDays: () => number,
    private readonly realNow: () => number = () => Date.now(),
  ) {
    super();
  }
  now(): Date {
    return new Date(this.realNow() + this.offsetDays() * MS_PER_DAY);
  }
}

/** Relógio controlado (testes e seed retroativo). */
export class ManualClock extends BaseClock {
  private current: number;
  constructor(start: Date | string) {
    super();
    this.current = new Date(start).getTime();
  }
  now(): Date {
    return new Date(this.current);
  }
  set(value: Date | string): void {
    this.current = new Date(value).getTime();
  }
  advance(ms: number): void {
    this.current += ms;
  }
  advanceDays(days: number): void {
    this.current += days * MS_PER_DAY;
  }
}
