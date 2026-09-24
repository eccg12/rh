import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Não encontramos esta página"
      description="O endereço pode ter mudado ou o item não existe mais."
      action={
        <Button asChild variant="outline">
          <Link href="/">Ir para o início</Link>
        </Button>
      }
    />
  );
}
