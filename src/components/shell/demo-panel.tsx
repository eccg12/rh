"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, Check, FlaskConical } from "lucide-react";
import { useState } from "react";

import { PersonAvatar } from "@/components/common/person-chip";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatWeekdayDate } from "@/lib/dates";

import { personaSwitchUrl, useApp } from "./app-context";

/**
 * Painel "Demo" (seção 5): persona atual e troca rápida, data virtual e restauração dos dados.
 * Só existe com DEMO_MODE=true.
 */
export function DemoPanel({ todayKey, children }: { todayKey: string; children?: React.ReactNode }) {
  const { session, personas, demoMode } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!demoMode) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-4 left-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-ink/70 bg-surface px-4 text-meta font-semibold text-ink shadow-float transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <FlaskConical aria-hidden className="size-4" strokeWidth={1.75} />
          Demo
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Modo demonstração</SheetTitle>
          <SheetDescription>
            Controles só para a apresentação. Com DEMO_MODE=false, nada disso aparece.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-semibold text-ink-soft">Data virtual</h3>
            <p className="flex items-center gap-2 font-medium tabular-nums">
              <CalendarDays aria-hidden className="size-4" strokeWidth={1.75} />
              {formatWeekdayDate(todayKey)}
            </p>
            {children}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-semibold text-ink-soft">Ver como</h3>
            <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule">
              {personas.map((p) => (
                <li key={p.id}>
                  <a
                    href={personaSwitchUrl(p.id, pathname)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                    aria-current={p.id === session.id ? "true" : undefined}
                  >
                    <PersonAvatar name={p.name} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="truncate text-meta text-ink-soft">{p.subtitle ?? p.rolesLabel}</span>
                    </span>
                    {p.id === session.id ? <Check aria-label="Persona atual" className="size-4" /> : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
