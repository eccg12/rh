import Link from "next/link";
import { Lock } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

/** Área fora do papel da persona atual. */
export function Forbidden({ area }: { area: string }) {
  return (
    <EmptyState
      icon={Lock}
      title={`${area} não está disponível para o seu perfil`}
      description="Se precisar de acesso, fale com o RH."
      action={
        <Button asChild variant="outline">
          <Link href="/">Ir para o início</Link>
        </Button>
      }
    />
  );
}
