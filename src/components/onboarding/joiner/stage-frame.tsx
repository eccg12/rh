"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Hourglass, Lock } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import type { StageData } from "@/domain/services/case-queries";

import { STAGE_BLOCKED_HINT } from "./texts";

/** Moldura das páginas de etapa: voltar, posição na jornada, estado e navegação entre etapas. */
export function StageFrame({ data, children }: { data: StageData; children: React.ReactNode }) {
  const index = data.stations.findIndex((s) => s.id === data.stage.id);
  const prev = data.stations[index - 1];
  const next = data.stations[index + 1];
  const blocked = data.stage.state === "bloqueada";
  const waiting = data.stage.state === "aguardando" && data.stage.status !== "concluida";

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="inline-flex w-fit items-center gap-1 rounded-sm text-meta font-medium text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Minha jornada
        </Link>
        <p className="text-meta text-ink-soft">
          Etapa {index + 1} de {data.stations.length}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-page font-semibold">{data.stage.title}</h1>
          {data.stage.status === "concluida" ? (
            <StatusBadge kind="task" status="concluida" />
          ) : data.stage.current && data.stage.state === "atual" ? (
            <span className="rounded-sm bg-signal px-1.5 py-0.5 text-meta font-medium text-ink">você está aqui</span>
          ) : null}
        </div>
        <p className="max-w-[64ch] text-ink-soft">{data.stage.summary}</p>
      </div>

      {blocked ? (
        <div className="flex items-start gap-3 rounded-lg border border-rule bg-surface p-4">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-soft" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Esta etapa ainda não está liberada</p>
            <p className="text-ink-soft">{STAGE_BLOCKED_HINT[data.stage.id]}</p>
          </div>
        </div>
      ) : waiting && data.tasks.every((t) => t.owner !== "new_joiner" || !t.actionable) ? (
        <div className="flex items-start gap-3 rounded-lg border border-rule bg-surface p-4">
          <Hourglass aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-soft" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Estamos preparando</p>
            <p className="text-ink-soft">Nada depende de você nesta etapa agora. Você recebe um e-mail quando estiver pronto.</p>
          </div>
        </div>
      ) : null}

      {children}

      <nav aria-label="Outras etapas" className="flex flex-wrap justify-between gap-3 border-t border-rule pt-5">
        {prev ? (
          <Link href={prev.href} className="inline-flex items-center gap-1 rounded-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink">
            <ChevronLeft aria-hidden className="size-4" />
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.href} className="inline-flex items-center gap-1 rounded-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink">
            {next.title}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
