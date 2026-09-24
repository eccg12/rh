import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/** Aviso obrigatório em todo conteúdo de exemplo (seção 0, item 7). */
export function ExampleContentNotice({
  className,
  text = "Conteúdo de exemplo — substituir pelo documento oficial",
}: {
  className?: string;
  text?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-sm border border-dashed border-control bg-surface px-2 py-1 text-meta text-ink-soft",
        className,
      )}
    >
      <Info aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      {text}
    </p>
  );
}
