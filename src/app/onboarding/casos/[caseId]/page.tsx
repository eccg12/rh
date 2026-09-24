import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { CaseDetailView } from "@/components/onboarding/rh/case-detail-view";
import { Forbidden } from "@/components/shell/forbidden";
import { getDomain } from "@/server/domain";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export async function generateMetadata(props: PageProps<"/onboarding/casos/[caseId]">) {
  const { caseId } = await props.params;
  const domain = await getDomain();
  const c = await domain.repo.cases.get(caseId);
  const person = c ? await domain.repo.people.get(c.personId) : undefined;
  return { title: person ? `Onboarding de ${person.name}` : "Caso de onboarding" };
}

export default async function CasePage(props: PageProps<"/onboarding/casos/[caseId]">) {
  const { caseId } = await props.params;
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "ADMIN_RH") return <Forbidden area="O detalhe do caso" />;
  const domain = await getDomain();
  if (!(await domain.repo.cases.get(caseId))) notFound();
  void api.onboarding.caseDetail.prefetch({ caseId });
  return (
    <HydrateClient>
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <CaseDetailView caseId={caseId} />
      </Suspense>
    </HydrateClient>
  );
}
