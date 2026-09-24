import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { ShellNotice } from "@/components/common/shell-notice";
import { RhCentral } from "@/components/onboarding/rh/rh-central";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed) return <Forbidden area="O onboarding" />;

  if (session.viewRole === "ADMIN_RH") {
    void api.onboarding.overview.prefetch();
    return (
      <HydrateClient>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <RhCentral />
        </Suspense>
      </HydrateClient>
    );
  }

  return (
    <>
      <PageHeader title={`Oi, ${session.firstName}.`} description="Sua jornada até o primeiro dia, etapa por etapa." />
      <ShellNotice title="Minha jornada" description="A linha da jornada e o próximo passo aparecem aqui." />
    </>
  );
}
