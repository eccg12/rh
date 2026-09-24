"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { moduleStatusLabel, modulesFor } from "@/config/modules";
import type { ViewRole } from "@/domain/schemas";
import { cn } from "@/lib/utils";


/** Abas do topo filtradas pelo papel. No celular, faixa rolável com a aba ativa centralizada. */
export function ModuleTabs({ role }: { role: ViewRole }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const items = modulesFor(role);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active) return;
    if (list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - list.clientWidth / 2 + active.clientWidth / 2;
  }, [pathname]);

  return (
    <ul ref={listRef} className="relative -mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((m) => {
        const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
        const statusLabel = moduleStatusLabel[m.status];
        return (
          <li key={m.id} className="shrink-0">
            <Link
              href={m.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-1.5 border-b-2 px-2.5 text-ui whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
                active
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-ink-soft hover:border-rule hover:text-ink",
              )}
            >
              {m.label}
              {statusLabel ? (
                <Badge variant="muted" className="px-1 py-0 text-[11px] font-medium">
                  {statusLabel}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
