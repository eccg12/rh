"use client";

import { TriangleAlert } from "lucide-react";

import { formatDuration } from "@/lib/dates";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FlowStripStage {
  id: string;
  title: string;
  /** Pessoas com esta etapa como etapa atual. */
  people: number;
  /** Tempo médio na etapa (dias); `null` sem dados. */
  avgDays: number | null;
  /** Etapa que espera a data de início: sem tempo médio nem gargalo. */
  waitsForStartDate?: boolean;
  isBottleneck: boolean;
}

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 24 12" className="w-6 shrink-0 self-center text-ink-soft" fill="none">
      <path d="M1 6h19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M16 1.5 21.5 6 16 10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Faixa de fluxo do onboarding (assinatura visual da visão RH, seção 9.2): uma caixa por etapa,
 * ligadas por setas, com pessoas na etapa e tempo médio. O gargalo tem borda, ícone e texto.
 * Clicar numa caixa filtra a tabela (`aria-pressed`).
 */
export function FlowStrip({
  stages,
  selectedId,
  onSelect,
  className,
}: {
  stages: FlowStripStage[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
}) {
  return (
    <ol aria-label="Etapas do fluxo de onboarding" className={cn("-mx-4 flex overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:px-0", className)}>
      {stages.map((stage, i) => {
        const selected = selectedId === stage.id;
        const time = stage.waitsForStartDate
          ? "aguarda a data de início"
          : stage.avgDays === null
            ? "sem dados ainda"
            : `${formatDuration(stage.avgDays)} em média`;
        return (
          <li key={stage.id} className="flex min-w-[124px] flex-1 items-stretch">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect?.(selected ? null : stage.id)}
              className={cn(
                "flex w-full flex-col gap-2 rounded-lg border bg-surface p-3 text-left transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                stage.isBottleneck ? "border-2 border-ink p-[11px]" : "border-rule",
                selected && "bg-tint ring-2 ring-ink ring-offset-2 ring-offset-paper",
              )}
            >
              <span className="min-h-[2.6em] text-meta leading-snug font-semibold">{stage.title}</span>
              <span className="flex flex-col gap-0.5 tabular-nums">
                <span className="text-ui font-medium">{plural(stage.people, "pessoa")}</span>
                <span className="text-meta text-ink-soft">{time}</span>
              </span>
              {stage.isBottleneck ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-ink px-1.5 py-0.5 text-meta font-medium text-white">
                  <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2} />
                  gargalo
                </span>
              ) : null}
            </button>
            {i < stages.length - 1 ? <Arrow /> : null}
          </li>
        );
      })}
    </ol>
  );
}
