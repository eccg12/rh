import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { OutboxView } from "@/components/admin/outbox-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("caixa-de-saida").title };

export default async function AdminOutboxPage() {
  void api.admin.outbox.prefetch();
  return (
    <AdminPage section="caixa-de-saida">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton />}>
          <OutboxView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
