import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { AutomationsView } from "@/components/admin/automations-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("automacoes").title };

export default async function AdminAutomacoesPage() {
  void api.admin.automations.prefetch();
  return (
    <AdminPage section="automacoes">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={8} />}>
          <AutomationsView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
