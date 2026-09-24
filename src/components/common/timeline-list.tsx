import { formatDateTime } from "@/lib/dates";
import type { TimelineEntry } from "@/domain/timeline";
import { cn } from "@/lib/utils";

import { AutomatedTag } from "./automated-tag";

/** Linha do tempo: eventos em ordem, ações automáticas com o raio e "automático" (seção 9.2). */
export function TimelineList({
  entries,
  className,
  showCaseLink,
}: {
  entries: TimelineEntry[];
  className?: string;
  showCaseLink?: (entry: TimelineEntry) => React.ReactNode;
}) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {entries.map((e) => (
        <li key={e.id} className="grid gap-x-4 gap-y-0.5 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[132px_1fr]">
          <time dateTime={e.at} className="text-meta text-ink-soft tabular-nums">
            {formatDateTime(e.at)}
          </time>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <span className={cn("min-w-0", e.automated ? "text-ink" : "font-medium")}>{e.title}</span>
              {e.automated ? <AutomatedTag /> : null}
            </div>
            <span className="text-meta text-ink-soft">
              {[e.detail, e.automated ? (e.ruleId ? `Regra ${e.ruleId}` : "Pelo fluxo") : `Por ${e.actorName}`].filter(Boolean).join(". ")}
            </span>
            {showCaseLink?.(e)}
          </div>
        </li>
      ))}
    </ol>
  );
}
