import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { DirectoryAdminView } from "@/components/admin/directory-admin-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("quem-e-quem").title };

export default async function AdminDirectoryPage() {
  void api.admin.directory.prefetch();
  return (
    <AdminPage section="quem-e-quem">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <DirectoryAdminView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
