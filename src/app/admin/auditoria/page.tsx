import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { AuditView } from "@/components/admin/audit-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("auditoria").title };

export default async function AdminAuditPage() {
  void api.admin.audit.prefetch({});
  return (
    <AdminPage section="auditoria">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <AuditView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
