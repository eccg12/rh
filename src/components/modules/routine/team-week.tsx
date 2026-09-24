"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

import { WeekNav } from "./timesheet-grid";

const fmt = (n: number) => (n ? String(Math.round(n * 10) / 10).replace(".", ",") : "—");

/** Horas por pessoa e projeto na semana (RH e gestores, dados simulados). */
export function TeamWeekPanel() {
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const { data, isFetching } = api.routine.team.useQuery({ weekStart }, { placeholderData: keepPreviousData });
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          weekStart={data.weekStart}
          previousWeekStart={data.previousWeekStart}
          nextWeekStart={data.nextWeekStart}
          currentWeekStart={data.currentWeekStart}
          onNavigate={setWeekStart}
          busy={isFetching}
        />
        <p className="text-meta text-ink-soft">
          {plural(data.totals.submitted, "semana enviada", "semanas enviadas")} de {data.rows.length}. Dados simulados.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full min-w-[720px] text-ui tabular-nums">
          <caption className="sr-only">Horas por pessoa e projeto na semana</caption>
          <thead>
            <tr className="border-b border-rule text-meta text-ink-soft">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Pessoa
              </th>
              {data.projects.map((p) => (
                <th key={p.id} scope="col" className="px-3 py-2 text-right font-semibold">
                  <span className="flex flex-col items-end">
                    <span>{p.name}</span>
                    <span className="font-normal">{p.client}</span>
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.person.id} className="border-b border-rule last:border-0">
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                  {row.person.name}
                </th>
                {data.projects.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-right">
                    {fmt(row.byProject[p.id] ?? 0)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-medium">{fmt(row.total)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge kind="timesheet" status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule bg-tint font-medium">
              <th scope="row" className="px-3 py-2 text-left">
                Total por projeto
              </th>
              {data.projects.map((p) => (
                <td key={p.id} className="px-3 py-2 text-right">
                  {fmt(data.totals.byProject[p.id] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">{fmt(data.totals.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {data.projects.length === 0 ? <p className="text-ink-soft">Ninguém apontou horas nesta semana ainda.</p> : null}
    </div>
  );
}
