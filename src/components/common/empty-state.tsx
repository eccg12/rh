import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Estado vazio que convida à ação (seção 9.1): nunca uma página em branco. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-rule bg-surface",
        compact ? "p-4" : "p-6",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-9 items-center justify-center rounded-full bg-tint text-ink">
          <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? <div className="max-w-[60ch] text-ink-soft">{description}</div> : null}
      </div>
      {action}
    </div>
  );
}
