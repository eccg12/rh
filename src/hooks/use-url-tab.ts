"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Aba ativa guardada em `?aba=` (link direto e voltar do navegador funcionam). */
export function useUrlTab<T extends string>(ids: readonly T[], fallback: T): [T, (next: string) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("aba");
  const tab = raw && (ids as readonly string[]).includes(raw) ? (raw as T) : fallback;
  const setTab = useCallback(
    (next: string) => {
      const q = new URLSearchParams(params.toString());
      q.set("aba", next);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  return [tab, setTab];
}
