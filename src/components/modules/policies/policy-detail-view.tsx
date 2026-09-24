"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

import { AckBadge, AckSentence } from "./ack-status";

export function PolicyDetailView({ policyId, version }: { policyId: string; version?: number }) {
  const [p] = api.policies.detail.useSuspenseQuery({ policyId, version });
  const refresh = useRefreshAll();
  const ack = api.policies.acknowledge.useMutation({
    onSuccess: async () => {
      toast.success("Política aceita");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const current = p.versions.find((v) => v.isCurrent);

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/politicas-beneficios?aba=politicas"
        className="-mb-4 inline-flex w-fit items-center gap-1.5 text-meta text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Políticas e benefícios
      </Link>
      <PageHeader
        className="mb-0 sm:mb-0"
        title={p.title}
        description={`${p.categoryLabel}. Versão ${p.shownVersion}, vigente desde ${formatDate(p.effectiveFrom)}.`}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="flex min-w-0 max-w-[720px] flex-col gap-5">
          {!p.isCurrent && current ? (
            <p className="rounded-lg border border-rule bg-tint px-4 py-3">
              Você está vendo a versão {p.shownVersion}, substituída pela versão {current.version} em{" "}
              {formatDate(current.effectiveFrom)}.{" "}
              <Link href={`/politicas-beneficios/${p.id}`} className="underline underline-offset-4">
                Ver a versão vigente
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <AckBadge my={p.my} />
                <span>
                  <AckSentence my={p.my} version={p.version} />
                </span>
              </div>
              {p.my.canAcknowledge ? (
                <Button className="w-fit" disabled={ack.isPending} onClick={() => ack.mutate({ policyId: p.id })}>
                  Aceitar política
                </Button>
              ) : null}
            </div>
          )}
          <p className="text-read">{p.summary}</p>
          {p.changelog && p.isCurrent ? (
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">O que mudou nesta versão: </span>
              {p.changelog}
            </p>
          ) : null}
          {p.isExample ? <ExampleContentNotice /> : null}
          <Markdown>{p.bodyMd}</Markdown>
          {p.my.canAcknowledge && p.isCurrent ? (
            <Button className="w-fit" disabled={ack.isPending} onClick={() => ack.mutate({ policyId: p.id })}>
              Aceitar política
            </Button>
          ) : null}
        </article>

        <aside aria-labelledby="versoes" className="flex flex-col gap-3">
          <SectionHeader id="versoes" title="Histórico de versões" />
          <ol className="flex flex-col divide-y divide-rule border-y border-rule">
            {p.versions.map((v) => (
              <li key={v.version} className="flex flex-col gap-1 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  {v.version === p.shownVersion ? (
                    <span className="font-semibold">Versão {v.version}</span>
                  ) : (
                    <Link
                      href={v.isCurrent ? `/politicas-beneficios/${p.id}` : `/politicas-beneficios/${p.id}?versao=${v.version}`}
                      className="font-semibold underline underline-offset-4"
                    >
                      Versão {v.version}
                    </Link>
                  )}
                  {v.isCurrent ? <StatusBadge kind="access" status="liberado" label="Vigente" /> : null}
                </span>
                <span className="text-meta text-ink-soft">Desde {formatDate(v.effectiveFrom)}.</span>
                {v.changelog ? <span className="text-meta">{v.changelog}</span> : null}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
