/**
 * Apontamento semanal (seção 9.8, beta): grade projetos × segunda a sexta, rascunho e envio, e a
 * visão da equipe para RH e gestores. Dados simulados; integração com o ERP fica para depois.
 */
import { addDaysKey, daysBetweenKeys, mondayOfKey } from "@/lib/dates";

import { recordAudit } from "../audit";
import type { DomainContext } from "../context";
import { DomainError } from "../context";
import type { Project, TimesheetWeek } from "../schemas";

export const MAX_HOURS_PER_DAY = 24;
export const WEEKDAYS = 5;

export type WeekHours = [number, number, number, number, number];

export interface TimesheetWeekView {
  week: TimesheetWeek;
  /** A semana ainda não foi salva (grade sugerida a partir da semana anterior). */
  isNew: boolean;
  projects: Project[];
  days: { key: string; editable: boolean }[];
  today: string;
  currentWeekStart: string;
  previousWeekStart: string;
  nextWeekStart?: string;
}

function sheetId(personId: string, weekStart: string): string {
  return `ts-${personId}-${weekStart}`;
}

function assertMonday(weekStart: string) {
  if (mondayOfKey(weekStart) !== weekStart) throw new DomainError("A semana começa na segunda-feira.");
}

export async function timesheetWeek(ctx: DomainContext, personId: string, weekStart?: string): Promise<TimesheetWeekView> {
  const today = ctx.clock.todayKey();
  const currentWeekStart = mondayOfKey(today);
  const start = weekStart ?? currentWeekStart;
  assertMonday(start);
  if (start > currentWeekStart) throw new DomainError("Ainda não dá para apontar semanas futuras.");
  const [sheets, projects] = await Promise.all([ctx.repo.timesheets.list(), ctx.repo.projects.list()]);
  const mine = sheets.filter((s) => s.personId === personId);
  const existing = mine.find((s) => s.weekStart === start);
  // Semana nova: começa com os projetos da última semana apontada, zerados.
  const previous = mine.filter((s) => s.weekStart < start).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  const week: TimesheetWeek = existing ?? {
    id: sheetId(personId, start),
    personId,
    weekStart: start,
    status: "rascunho",
    rows: (previous?.rows ?? []).map((r) => ({ projectId: r.projectId, hours: [0, 0, 0, 0, 0] as WeekHours })),
  };
  return {
    week,
    isNew: !existing,
    projects,
    days: Array.from({ length: WEEKDAYS }, (_, i) => {
      const key = addDaysKey(start, i);
      return { key, editable: week.status === "rascunho" && key <= today };
    }),
    today,
    currentWeekStart,
    previousWeekStart: addDaysKey(start, -7),
    nextWeekStart: start < currentWeekStart ? addDaysKey(start, 7) : undefined,
  };
}

export function weekTotal(rows: { hours: number[] }[]): number {
  return rows.reduce((sum, r) => sum + r.hours.reduce((a, b) => a + b, 0), 0);
}

export function dayTotals(rows: { hours: number[] }[]): number[] {
  return Array.from({ length: WEEKDAYS }, (_, i) => rows.reduce((sum, r) => sum + (r.hours[i] ?? 0), 0));
}

export async function saveTimesheet(
  ctx: DomainContext,
  personId: string,
  input: { weekStart: string; rows: { projectId: string; hours: WeekHours }[]; submit?: boolean },
  actorId: string,
): Promise<TimesheetWeek> {
  const view = await timesheetWeek(ctx, personId, input.weekStart);
  if (view.week.status === "enviado") throw new DomainError("Esta semana já foi enviada.", "CONFLICT");
  const projectIds = new Set(view.projects.map((p) => p.id));
  const seen = new Set<string>();
  for (const row of input.rows) {
    if (!projectIds.has(row.projectId)) throw new DomainError("Projeto não encontrado.", "NOT_FOUND");
    if (seen.has(row.projectId)) throw new DomainError("Cada projeto aparece uma vez na grade.");
    seen.add(row.projectId);
    row.hours.forEach((h, i) => {
      if (!Number.isFinite(h) || h < 0 || h > MAX_HOURS_PER_DAY || Math.round(h * 2) !== h * 2) {
        throw new DomainError("Use horas de 0 a 24, em intervalos de meia hora.");
      }
      if (h > 0 && !view.days[i]?.editable) throw new DomainError("Não dá para apontar horas em dias que ainda não chegaram.");
    });
  }
  const totals = dayTotals(input.rows);
  const overDay = totals.findIndex((t) => t > MAX_HOURS_PER_DAY);
  if (overDay >= 0) throw new DomainError("Um dia não pode passar de 24 horas somando os projetos.");
  const total = weekTotal(input.rows);
  if (input.submit && total <= 0) throw new DomainError("Aponte ao menos uma hora antes de enviar a semana.");

  const week: TimesheetWeek = {
    ...view.week,
    rows: input.rows.filter((r) => !input.submit || r.hours.some((h) => h > 0)),
    status: input.submit ? "enviado" : "rascunho",
    submittedAt: input.submit ? ctx.clock.nowIso() : undefined,
  };
  await ctx.repo.timesheets.save(week);
  if (input.submit) {
    await recordAudit(ctx, {
      type: "timesheet.submitted",
      personId,
      actorId,
      payload: { weekStart: week.weekStart, total },
    });
  }
  return week;
}

export interface TeamWeekRow {
  person: { id: string; name: string };
  status: "enviado" | "rascunho" | "sem_apontamento";
  submittedAt?: string;
  byProject: Record<string, number>;
  total: number;
}

export interface TeamWeek {
  weekStart: string;
  previousWeekStart: string;
  nextWeekStart?: string;
  currentWeekStart: string;
  projects: Project[];
  rows: TeamWeekRow[];
  totals: { byProject: Record<string, number>; total: number; submitted: number };
}

/** Horas por pessoa e projeto na semana (RH e gestores). Quem aponta: a equipe, sem new joiners em onboarding. */
export async function teamWeek(ctx: DomainContext, weekStart?: string): Promise<TeamWeek> {
  const today = ctx.clock.todayKey();
  const currentWeekStart = mondayOfKey(today);
  const start = weekStart ?? addDaysKey(currentWeekStart, daysBetweenKeys(currentWeekStart, today) >= 4 ? 0 : -7);
  assertMonday(start);
  const [sheets, projects, people, cases] = await Promise.all([
    ctx.repo.timesheets.list(),
    ctx.repo.projects.list(),
    ctx.repo.people.list(),
    ctx.repo.cases.list(),
  ]);
  const onboarding = new Set(cases.filter((c) => c.status !== "concluido").map((c) => c.personId));
  const team = people.filter((p) => !onboarding.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const rows: TeamWeekRow[] = team.map((p) => {
    const sheet = sheets.find((s) => s.personId === p.id && s.weekStart === start);
    const byProject: Record<string, number> = {};
    for (const r of sheet?.rows ?? []) byProject[r.projectId] = r.hours.reduce((a, b) => a + b, 0);
    return {
      person: { id: p.id, name: p.name },
      status: sheet ? sheet.status : "sem_apontamento",
      submittedAt: sheet?.submittedAt,
      byProject,
      total: Object.values(byProject).reduce((a, b) => a + b, 0),
    };
  });
  const byProject: Record<string, number> = {};
  for (const r of rows) for (const [id, h] of Object.entries(r.byProject)) byProject[id] = (byProject[id] ?? 0) + h;
  return {
    weekStart: start,
    previousWeekStart: addDaysKey(start, -7),
    nextWeekStart: start < currentWeekStart ? addDaysKey(start, 7) : undefined,
    currentWeekStart,
    projects: projects.filter((p) => (byProject[p.id] ?? 0) > 0),
    rows,
    totals: {
      byProject,
      total: Object.values(byProject).reduce((a, b) => a + b, 0),
      submitted: rows.filter((r) => r.status === "enviado").length,
    },
  };
}
