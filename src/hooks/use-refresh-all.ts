"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { api } from "@/trpc/react";

/**
 * Depois de uma mutação: invalida todas as consultas (o estado do domínio é interligado) e
 * atualiza os Server Components (cabeçalho, lista de personas, data virtual).
 */
export function useRefreshAll() {
  const utils = api.useUtils();
  const router = useRouter();
  return useCallback(async () => {
    await utils.invalidate();
    router.refresh();
  }, [utils, router]);
}
