import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { ComplianceAdminView } from "@/components/admin/compliance-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("compliance").title };

export default async function AdminCompliancePage() {
  void api.admin.compliance.prefetch();
  return (
    <AdminPage section="compliance">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <ComplianceAdminView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
