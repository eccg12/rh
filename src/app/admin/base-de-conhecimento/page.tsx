import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { KnowledgeAdminView } from "@/components/admin/knowledge-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("base-de-conhecimento").title };

export default async function AdminKnowledgePage() {
  void api.admin.knowledge.prefetch();
  return (
    <AdminPage section="base-de-conhecimento">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={8} />}>
          <KnowledgeAdminView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
