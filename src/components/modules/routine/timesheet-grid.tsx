"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatShortDay, formatWeekRange, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";

type WeekView = RouterOutputs["routine"]["week"];
type Hours = [number, number, number, number, number];

const fmt = (n: number) => (n === 0 ? "" : String(n).replace(".", ","));
const fmtTotal = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

function parseHours(value: string): number {
  const v = value.trim().replace(",", ".");
  if (v === "") return 0;
  return Number(v);
}

function validCell(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 24 && Math.round(n * 2) === n * 2;
}

/** Navegação entre semanas; salva o rascunho antes de sair, se houver mudança. */
export function WeekNav({
  weekStart,
  previousWeekStart,
  nextWeekStart,
  currentWeekStart,
  onNavigate,
  busy,
}: {
  weekStart: string;
  previousWeekStart: string;
  nextWeekStart?: string;
  currentWeekStart: string;
  onNavigate: (week: string) => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon-sm" aria-label="Semana anterior" disabled={busy} onClick={() => onNavigate(previousWeekStart)}>
        <ChevronLeft aria-hidden strokeWidth={1.75} />
      </Button>
      <p className="min-w-[13rem] text-center font-semibold" aria-live="polite">
        Semana de {formatWeekRange(weekStart)}
      </p>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Próxima semana"
        disabled={busy || !nextWeekStart}
        onClick={() => nextWeekStart && onNavigate(nextWeekStart)}
      >
        <ChevronRight aria-hidden strokeWidth={1.75} />
      </Button>
      {weekStart !== currentWeekStart ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onNavigate(currentWeekStart)}>
          Esta semana
        </Button>
      ) : null}
    </div>
  );
}

function TimesheetEditor({ data, onNavigate, busy }: { data: WeekView; onNavigate: (week: string) => void; busy: boolean }) {
  const utils = api.useUtils();
  const addId = useId();
  const editable = data.week.status === "rascunho";
  const [rows, setRows] = useState(() => data.week.rows.map((r) => ({ projectId: r.projectId, hours: r.hours.map(fmt) })));
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? id;
  const projectClient = (id: string) => data.projects.find((p) => p.id === id)?.client;

  const numeric = rows.map((r) => ({ projectId: r.projectId, hours: r.hours.map(parseHours) as Hours }));
  const dayTotals = data.days.map((_, i) => numeric.reduce((sum, r) => sum + (Number.isFinite(r.hours[i]!) ? r.hours[i]! : 0), 0));
  const total = dayTotals.reduce((a, b) => a + b, 0);
  const invalid = numeric.some((r) => r.hours.some((h) => !validCell(h))) || dayTotals.some((t) => t > 24);
  const available = data.projects.filter((p) => !rows.some((r) => r.projectId === p.id));

  const save = api.routine.save.useMutation({
    onSuccess: async (week) => {
      setDirty(false);
      if (week.status === "enviado") toast.success("Semana enviada", { description: `${fmtTotal(total)} horas apontadas.` });
      else toast.success("Rascunho salvo");
      await utils.routine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const persist = (submit: boolean) => save.mutateAsync({ weekStart: data.week.weekStart, rows: numeric, submit });

  const navigate = async (week: string) => {
    if (dirty && editable && !invalid) {
      try {
        await persist(false);
      } catch {
        return;
      }
    }
    onNavigate(week);
  };

  const setCell = (rowIndex: number, day: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, hours: r.hours.map((h, d) => (d === day ? value : h)) } : r)));
    setDirty(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          weekStart={data.week.weekStart}
          previousWeekStart={data.previousWeekStart}
          nextWeekStart={data.nextWeekStart}
          currentWeekStart={data.currentWeekStart}
          onNavigate={(w) => void navigate(w)}
          busy={busy || save.isPending}
        />
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="timesheet" status={data.week.status} />
          {data.week.submittedAt ? <span className="text-meta text-ink-soft">em {formatDateTime(data.week.submittedAt)}</span> : null}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full min-w-[640px] text-ui tabular-nums">
          <caption className="sr-only">Horas por projeto e dia da semana</caption>
          <thead>
            <tr className="border-b border-rule text-meta text-ink-soft">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Projeto
              </th>
              {data.days.map((d) => (
                <th key={d.key} scope="col" className={cn("px-2 py-2 text-center font-semibold", d.key === data.today && "text-ink")}>
                  <span className="flex flex-col">
                    <span>{weekdayShort(d.key)}</span>
                    <span className="font-normal">{formatShortDay(d.key)}</span>
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Total
              </th>
              {editable ? (
                <th scope="col" className="w-10">
                  <span className="sr-only">Remover</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={editable ? 8 : 7} className="px-3 py-6 text-ink-soft">
                  Nenhum projeto nesta semana. {editable ? "Adicione um projeto para começar." : ""}
                </td>
              </tr>
            ) : null}
            {rows.map((row, rowIndex) => {
              const rowTotal = numeric[rowIndex]!.hours.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
              return (
                <tr key={row.projectId} className="border-b border-rule last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="flex flex-col">
                      <span className="font-medium">{projectName(row.projectId)}</span>
                      <span className="text-meta text-ink-soft">{projectClient(row.projectId)}</span>
                    </span>
                  </th>
                  {data.days.map((d, day) => {
                    const value = row.hours[day] ?? "";
                    const bad = !validCell(parseHours(value));
                    return (
                      <td key={d.key} className="px-1.5 py-2 text-center">
                        {editable && d.editable ? (
                          <Input
                            inputMode="decimal"
                            value={value}
                            placeholder="0"
                            aria-label={`${projectName(row.projectId)}, ${weekdayShort(d.key)} ${formatShortDay(d.key)}`}
                            aria-invalid={bad}
                            onChange={(e) => setCell(rowIndex, day, e.target.value)}
                            className="mx-auto h-9 w-16 px-2 text-center"
                          />
                        ) : (
                          <span className={cn("inline-block w-16", !value && "text-ink-soft")}>{value || "—"}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-medium">{fmtTotal(rowTotal)}</td>
                  {editable ? (
                    <td className="px-1 py-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remover ${projectName(row.projectId)}`}
                        onClick={() => {
                          setRows((prev) => prev.filter((_, i) => i !== rowIndex));
                          setDirty(true);
                        }}
                      >
                        <X aria-hidden strokeWidth={1.75} />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule bg-tint font-medium">
              <th scope="row" className="px-3 py-2 text-left">
                Total do dia
              </th>
              {dayTotals.map((t, i) => (
                <td key={data.days[i]!.key} className={cn("px-2 py-2 text-center", t > 24 && "text-stop")}>
                  {fmtTotal(t)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">{fmtTotal(total)} h</td>
              {editable ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {invalid ? (
        <p className="text-meta text-stop" role="alert">
          Use horas de 0 a 24, em intervalos de meia hora (por exemplo, 7,5), sem passar de 24 horas no dia.
        </p>
      ) : null}

      {editable ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={addId}>Adicionar projeto</Label>
            <Select
              value=""
              onValueChange={(projectId) => {
                setRows((prev) => [...prev, { projectId, hours: ["", "", "", "", ""] }]);
                setDirty(true);
              }}
              disabled={available.length === 0}
            >
              <SelectTrigger id={addId} className="w-[260px] max-w-full">
                <SelectValue placeholder={available.length === 0 ? "Todos os projetos já estão na grade" : "Escolha o projeto"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.client})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!dirty || invalid || save.isPending} onClick={() => void persist(false).catch(() => undefined)}>
              Salvar rascunho
            </Button>
            <Button disabled={invalid || total <= 0 || save.isPending} onClick={() => setConfirming(true)}>
              Enviar semana
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-meta text-ink-soft">Semana enviada. As horas vão para os indicadores de utilização da equipe.</p>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a semana?</DialogTitle>
            <DialogDescription>
              {fmtTotal(total)} horas na semana de {formatWeekRange(data.week.weekStart)}. Depois de enviada, a semana fica só para
              leitura.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                void persist(true)
                  .then(() => setConfirming(false))
                  .catch(() => undefined)
              }
            >
              Enviar semana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Grade semanal do colaborador (seção 9.8). */
export function TimesheetPanel() {
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const { data, isFetching } = api.routine.week.useQuery({ weekStart }, { placeholderData: keepPreviousData });
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  return (
    <TimesheetEditor
      key={`${data.week.weekStart}|${data.week.status}`}
      data={data}
      onNavigate={setWeekStart}
      busy={isFetching}
    />
  );
}
