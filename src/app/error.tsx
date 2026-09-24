"use client";

import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Algo deu errado ao carregar esta página"
      description={
        <>
          Tente de novo. Se continuar, restaure os dados iniciais pelo painel Demo.
          {error.message ? <span className="mt-2 block text-meta">Detalhe: {error.message}</span> : null}
        </>
      }
      action={<Button onClick={reset}>Tentar de novo</Button>}
    />
  );
}
