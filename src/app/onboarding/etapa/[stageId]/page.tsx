import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { StageView } from "@/components/onboarding/joiner/stage-view";
import { Forbidden } from "@/components/shell/forbidden";
import { STAGE_TITLES } from "@/config/workflows";
import { StageIdSchema } from "@/domain/schemas";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export async function generateMetadata(props: PageProps<"/onboarding/etapa/[stageId]">) {
  const { stageId } = await props.params;
  const parsed = StageIdSchema.safeParse(stageId);
  return { title: parsed.success ? STAGE_TITLES[parsed.data] : "Etapa" };
}

export default async function StagePage(props: PageProps<"/onboarding/etapa/[stageId]">) {
  const { stageId } = await props.params;
  const parsed = StageIdSchema.safeParse(stageId);
  if (!parsed.success) notFound();
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "NEW_JOINER" || !session.caseId) return <Forbidden area="Esta etapa" />;
  void api.onboarding.stage.prefetch({ stageId: parsed.data });
  return (
    <HydrateClient>
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <StageView stageId={parsed.data} />
      </Suspense>
    </HydrateClient>
  );
}
