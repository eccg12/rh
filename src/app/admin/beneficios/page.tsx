import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { BenefitsAdminView } from "@/components/admin/benefits-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { getDomain } from "@/server/domain";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("beneficios").title };

export default async function AdminBeneficiosPage() {
  void api.admin.benefits.prefetch();
  const today = (await getDomain()).clock.todayKey();
  return (
    <AdminPage section="beneficios">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <BenefitsAdminView today={today} />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
