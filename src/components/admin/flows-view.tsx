"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlowDescription } from "@/domain/workflow-description";
import { useUrlTab } from "@/hooks/use-url-tab";
import { formatMinutes, roundMinutes } from "@/lib/dates";
import { cn } from "@/lib/utils";

function Flow({ flow }: { flow: FlowDescription }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-soft">
        {flow.stages.length} etapas e {flow.totals.tasks} tarefas ({flow.totals.required} obrigatórias). Quem entra gasta cerca de{" "}
        {formatMinutes(roundMinutes(flow.totals.joinerMinutes))} nas tarefas dele.
      </p>
      {flow.badge ? (
        <p className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-control bg-surface px-3 py-2">
          <Info aria-hidden className="size-4" strokeWidth={1.75} />
          {flow.badge}
        </p>
      ) : null}
      <ol className="flex flex-col gap-6">
        {flow.stages.map((stage) => (
          <li key={stage.id} className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-section font-semibold">
                <span className="sr-only">Etapa {stage.order}: </span>
                {stage.title}
              </h2>
              <p className="text-ink-soft">
                {stage.summary}
                {stage.waitsForStartDate ? " Espera a data de início." : ""}
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-rule border-t border-rule">
              {stage.tasks.map((t) => (
                <li key={t.id} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.title}</span>
                      {!t.required ? <Badge variant="muted">Opcional</Badge> : null}
                    </span>
                    <span className="text-meta text-ink-soft">
                      {t.unlock}.{t.appliesWhen ? ` ${t.appliesWhen}.` : ""}
                    </span>
                  </div>
                  <span className={cn("text-meta sm:text-right", t.owner === "new_joiner" ? "text-ink" : "text-ink-soft")}>
                    {t.ownerLabel}
                    {t.owner === "new_joiner" && t.minutes ? `, cerca de ${t.minutes} min` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FlowsView({ flows }: { flows: FlowDescription[] }) {
  const ids = flows.map((f) => f.id);
  const [tab, setTab] = useUrlTab<string>(ids, ids[0] ?? "pj");
  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <TabsList aria-label="Fluxos">
        {flows.map((f) => (
          <TabsTrigger key={f.id} value={f.id}>
            {f.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {flows.map((f) => (
        <TabsContent key={f.id} value={f.id}>
          <Flow flow={f} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
