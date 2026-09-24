import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { PoliciesAdminView } from "@/components/admin/policies-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { getDomain } from "@/server/domain";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("politicas").title };

export default async function AdminPoliticasPage() {
  void api.admin.policies.prefetch();
  const today = (await getDomain()).clock.todayKey();
  return (
    <AdminPage section="politicas">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <PoliciesAdminView today={today} />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
