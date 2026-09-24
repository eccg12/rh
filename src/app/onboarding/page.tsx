import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { JourneyView } from "@/components/onboarding/joiner/journey-view";
import { RhCentral } from "@/components/onboarding/rh/rh-central";
import { Forbidden } from "@/components/shell/forbidden";
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

  void api.onboarding.journey.prefetch();
  return (
    <HydrateClient>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <JourneyView />
      </Suspense>
    </HydrateClient>
  );
}
