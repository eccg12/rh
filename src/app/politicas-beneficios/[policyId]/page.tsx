import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { PolicyDetailView } from "@/components/modules/policies/policy-detail-view";
import { Forbidden } from "@/components/shell/forbidden";
import { getDomain } from "@/server/domain";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Política" };

export default async function PolicyPage(props: PageProps<"/politicas-beneficios/[policyId]">) {
  const { allowed } = await guardModule("politicas");
  if (!allowed) return <Forbidden area="Políticas e benefícios" />;
  const [{ policyId }, { versao }] = await Promise.all([props.params, props.searchParams]);
  const parsed = typeof versao === "string" ? Number.parseInt(versao, 10) : Number.NaN;
  const version = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  const versions = (await (await getDomain()).repo.policies.listVersions()).filter((p) => p.id === policyId);
  if (versions.length === 0 || (version && !versions.some((p) => p.version === version))) notFound();
  void api.policies.detail.prefetch({ policyId, version });
  return (
    <HydrateClient>
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <PolicyDetailView policyId={policyId} version={version} />
      </Suspense>
    </HydrateClient>
  );
}
