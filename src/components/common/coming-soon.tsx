import { Sprout, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Módulo futuro: "em breve" desenhado com o que vem (seção 9.1). */
export function ComingSoon({
  title,
  description,
  items,
  icon: Icon = Sprout,
  children,
}: {
  title: string;
  description: React.ReactNode;
  items: { title: string; detail: string }[];
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-rule bg-surface p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-5 text-ink" strokeWidth={1.75} />
          <h2 className="text-section">{title}</h2>
          <Badge variant="muted">Em breve</Badge>
        </div>
        <div className="max-w-[68ch] text-ink-soft">{description}</div>
      </div>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-1 border-t border-rule pt-3">
            <span className="font-medium">{item.title}</span>
            <span className="text-meta text-ink-soft">{item.detail}</span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
