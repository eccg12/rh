"use client";

import Link from "next/link";
import { Check, Circle, Hourglass, Lock } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type StationState = "concluida" | "atual" | "aguardando" | "disponivel" | "bloqueada";

export interface JourneyStation {
  id: string;
  title: string;
  state: StationState;
  /** Estação atual (seção 7.2); pode estar "aguardando a Monoda". */
  current?: boolean;
  href?: string;
  /** Texto curto abaixo do título (ex.: "2 de 3 tarefas"). */
  note?: string;
}

const STATE_TEXT: Record<StationState, string> = {
  concluida: "concluída",
  atual: "você está aqui",
  aguardando: "aguardando a Monoda",
  disponivel: "liberada",
  bloqueada: "bloqueada",
};

const isCurrent = (s: JourneyStation) => s.current ?? s.state === "atual";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readStored(key: string | undefined): number | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeStored(key: string | undefined, value: number) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // armazenamento indisponível (aba anônima): a linha só não anima
  }
}

/**
 * Índice até onde o trilho está percorrido. Todas concluídas → última estação.
 * Com animação "advance", começa do último índice visto e avança até o atual (500 ms).
 */
function useTraveledIndex(stations: JourneyStation[], storageKey: string | undefined, animation: "draw" | "advance" | "none") {
  const current = stations.findIndex(isCurrent);
  const allDone = stations.every((s) => s.state === "concluida");
  const target = allDone ? stations.length - 1 : Math.max(0, current);
  const [shown, setShown] = useState(animation === "draw" ? 0 : target);

  useIsoLayoutEffect(() => {
    if (animation === "none") {
      setShown(target);
      return;
    }
    const start = animation === "draw" ? 0 : (readStored(storageKey) ?? target);
    if (start >= target) {
      setShown(target);
      writeStored(storageKey, target);
      return;
    }
    setShown(start);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShown(target));
    });
    writeStored(storageKey, target);
    return () => window.cancelAnimationFrame(id);
  }, [target, storageKey, animation]);

  return shown;
}

function Marker({ state }: { state: StationState }) {
  if (state === "concluida") {
    return (
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "atual") {
    return (
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-signal ring-2 ring-ink ring-offset-2 ring-offset-surface">
        <span className="size-2 rounded-full bg-ink" />
      </span>
    );
  }
  if (state === "disponivel") {
    return (
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface text-ink">
        <Circle aria-hidden className="size-2 fill-current" strokeWidth={0} />
      </span>
    );
  }
  if (state === "aguardando") {
    return (
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink-soft bg-surface text-ink-soft">
        <Hourglass aria-hidden className="size-3" strokeWidth={2.25} />
      </span>
    );
  }
  return (
    <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-control/60 bg-surface text-ink-soft/80">
      <Lock aria-hidden className="size-3" strokeWidth={2} />
    </span>
  );
}

function StationLabel({ station, compact = false }: { station: JourneyStation; compact?: boolean }) {
  const title = (
    <span className={cn(isCurrent(station) ? "font-semibold" : "font-medium", station.state === "bloqueada" && "text-ink-soft")}>
      {station.title}
    </span>
  );
  return (
    <span className={cn("flex min-w-0 flex-col gap-1", compact && "items-center text-center")}>
      {station.href ? (
        <Link href={station.href} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink">
          {title}
        </Link>
      ) : (
        title
      )}
      {station.state === "atual" ? (
        <span className="w-fit rounded-sm bg-signal px-1.5 py-px text-meta font-medium text-ink">
          {STATE_TEXT.atual}
        </span>
      ) : station.state === "aguardando" ? (
        <span className="text-meta text-ink-soft">
          {isCurrent(station) ? <span className="sr-only">você está aqui, </span> : null}
          {STATE_TEXT.aguardando}
        </span>
      ) : station.state === "disponivel" ? (
        <span className="text-meta text-ink-soft">{STATE_TEXT.disponivel}</span>
      ) : (
        <span className="sr-only">{STATE_TEXT[station.state]}</span>
      )}
      {station.note && !compact ? <span className="text-meta text-ink-soft">{station.note}</span> : null}
    </span>
  );
}

/**
 * Linha da jornada (seção 12.2): lista ordenada com `aria-current="step"` na estação atual.
 * Vertical a partir de `md`; stepper horizontal no celular, com a estação atual centralizada.
 * Único movimento orquestrado do produto: "draw" na boas-vindas, "advance" quando uma etapa conclui.
 */
export function JourneyLine({
  stations,
  storageKey,
  animation = "advance",
  label = "Etapas do seu onboarding",
  className,
}: {
  stations: JourneyStation[];
  storageKey?: string;
  animation?: "draw" | "advance" | "none";
  label?: string;
  className?: string;
}) {
  const traveled = useTraveledIndex(stations, storageKey, animation);
  const stepperRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = stepperRef.current;
    if (!list) return;
    const current = list.querySelector<HTMLElement>('[aria-current="step"]');
    if (!current) return;
    list.scrollLeft = current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2;
  }, [stations]);

  const drawing = animation === "draw";

  return (
    <div className={className}>
      {/* Celular: stepper horizontal */}
      <ol
        ref={stepperRef}
        aria-label={label}
        className="flex snap-x overflow-x-auto pt-2 pb-3 md:hidden"
      >
        {stations.map((s, i) => (
          <li
            key={s.id}
            aria-current={isCurrent(s) ? "step" : undefined}
            className="relative flex w-[104px] shrink-0 snap-center flex-col items-center gap-2 px-1"
          >
            {i > 0 ? (
              <span aria-hidden className="absolute top-[11px] right-1/2 left-0 h-0.5 -translate-x-3 bg-rule">
                <span
                  className="block h-full w-full origin-left bg-ink transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${i <= traveled ? 1 : 0})` }}
                />
              </span>
            ) : null}
            {i < stations.length - 1 ? (
              <span aria-hidden className="absolute top-[11px] right-0 left-1/2 h-0.5 translate-x-3 bg-rule">
                <span
                  className="block h-full w-full origin-left bg-ink transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${i + 1 <= traveled ? 1 : 0})` }}
                />
              </span>
            ) : null}
            <Marker state={s.state} />
            <span className="text-meta leading-snug">
              <StationLabel station={s} compact />
            </span>
          </li>
        ))}
      </ol>

      {/* Desktop: linha vertical */}
      <ol aria-label={label} className="hidden md:flex md:flex-col">
        {stations.map((s, i) => (
          <li
            key={s.id}
            aria-current={isCurrent(s) ? "step" : undefined}
            className={cn("relative flex gap-3 pb-7 last:pb-0", drawing && "animate-in fade-in-0 fill-mode-both")}
            style={drawing ? { animationDelay: `${i * 70}ms`, animationDuration: "300ms" } : undefined}
          >
            {i < stations.length - 1 ? (
              <span
                aria-hidden
                className={cn("absolute top-6 bottom-0 left-[11px] w-0.5 origin-top bg-rule", drawing && "animate-draw-line")}
                style={drawing ? { animationDelay: `${i * 70}ms` } : undefined}
              >
                <span
                  className="block h-full w-full origin-top bg-ink transition-transform duration-500 ease-out"
                  style={{ transform: `scaleY(${i + 1 <= traveled ? 1 : 0})`, transitionDelay: `${Math.max(0, i) * 60}ms` }}
                />
              </span>
            ) : null}
            <Marker state={s.state} />
            <StationLabel station={s} />
          </li>
        ))}
      </ol>
    </div>
  );
}
