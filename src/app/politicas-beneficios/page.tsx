import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { PoliciesView } from "@/components/modules/policies/policies-view";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Políticas e benefícios" };

export default async function PoliciesPage() {
  const { session, allowed } = await guardModule("politicas");
  if (!allowed) return <Forbidden area="Políticas e benefícios" />;
  const isRh = session.viewRole === "ADMIN_RH";
  void api.policies.overview.prefetch();
  return (
    <HydrateClient>
      <PageHeader
        title="Políticas e benefícios"
        description={
          isRh
            ? "Quem aceitou cada política, as versões vigentes e os benefícios ativos."
            : "As políticas vigentes, o seu aceite e os benefícios ativos."
        }
      />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <PoliciesView isRh={isRh} />
      </Suspense>
    </HydrateClient>
  );
}
