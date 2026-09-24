import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { DemoAdminView } from "@/components/admin/demo-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { isDemoMode } from "@/server/env";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("demo").title };

export default async function AdminDemoPage() {
  if (!isDemoMode()) notFound();
  void api.demo.state.prefetch();
  return (
    <AdminPage section="demo">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={3} />}>
          <DemoAdminView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
