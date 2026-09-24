import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

/** Etiqueta de ação automática: ícone de raio + "automático" (seção 12.8). */
export function AutomatedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm bg-tint px-1.5 py-0.5 text-meta font-medium text-ink",
        className,
      )}
    >
      <Zap aria-hidden className="size-3.5" strokeWidth={2} />
      automático
    </span>
  );
}
