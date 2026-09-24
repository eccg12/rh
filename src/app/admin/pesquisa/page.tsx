import { Suspense } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { SurveyView } from "@/components/admin/survey-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { adminSection } from "@/config/admin-sections";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: adminSection("pesquisa").title };

export default async function AdminSurveyPage() {
  void api.admin.survey.prefetch();
  return (
    <AdminPage section="pesquisa">
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <SurveyView />
        </Suspense>
      </HydrateClient>
    </AdminPage>
  );
}
