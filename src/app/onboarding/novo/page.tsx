import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { NewCaseForm } from "@/components/onboarding/rh/new-case-form";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Cadastrar new joiner" };

export default async function NewCasePage() {
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "ADMIN_RH") return <Forbidden area="O cadastro de new joiners" />;
  void api.onboarding.formOptions.prefetch();
  return (
    <HydrateClient>
      <PageHeader title="Cadastrar new joiner" description="Pessoa, vínculo e preparação, com revisão ao final. As boas-vindas saem sozinhas." />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <NewCaseForm />
      </Suspense>
    </HydrateClient>
  );
}
