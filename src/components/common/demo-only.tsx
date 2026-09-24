"use client";

import { FlaskConical } from "lucide-react";

import { useDemoMode } from "@/components/shell/app-context";
import { cn } from "@/lib/utils";

/** Renderiza só no modo demo (DEMO_MODE, D-OB-13). */
export function DemoOnly({ children }: { children: React.ReactNode }) {
  const demo = useDemoMode();
  return demo ? <>{children}</> : null;
}

/**
 * Atalho de demonstração, visualmente distinto do produto: contorno tracejado e rótulo "Demo"
 * (seção 5). Some com DEMO_MODE=false.
 */
export function DemoShortcut({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const demo = useDemoMode();
  if (!demo) return null;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-fit items-center gap-2 rounded-md border border-dashed border-ink/60 bg-surface px-3 text-meta font-medium text-ink transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 rounded-sm bg-ink px-1 py-px text-[11px] font-semibold text-white">
        <FlaskConical aria-hidden className="size-3" strokeWidth={2} />
        Demo
      </span>
      {children}
    </button>
  );
}
