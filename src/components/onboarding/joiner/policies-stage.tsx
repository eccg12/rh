"use client";

import { HeartPulse, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

type PoliciesData = Extract<StageData, { kind: "politicas-beneficios" }>;
type PolicyItem = PoliciesData["policies"][number];

function PolicyCard({ p }: { p: PolicyItem }) {
  const refresh = useRefreshAll();
  const [expanded, setExpanded] = useState(false);
  const ack = api.onboarding.acknowledgePolicy.useMutation({
    onSuccess: async () => {
      toast.success("Política aceita");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const open = p.taskStatus === "disponivel";
  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold">{p.title}</h3>
          <p className="text-meta text-ink-soft">
            Versão {p.version}, vigente desde {formatDate(p.effectiveFrom)}
          </p>
        </div>
        {p.acknowledged ? <StatusBadge kind="ack" status="aceita" /> : open ? <StatusBadge kind="ack" status="pendente" /> : null}
      </div>
      <p>{p.summary}</p>
      {p.isExample ? <ExampleContentNotice /> : null}
      <Button variant="link" className="h-auto w-fit px-0" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Esconder o texto completo" : "Ler o texto completo"}
      </Button>
      {expanded ? <Markdown className="border-t border-rule pt-3">{p.bodyMd}</Markdown> : null}
      {!p.acknowledged && open ? (
        <Button className="w-fit" disabled={ack.isPending} onClick={() => ack.mutate({ policyId: p.id })}>
          Aceitar política
        </Button>
      ) : null}
    </Card>
  );
}

export function PoliciesStage({ data }: { data: PoliciesData }) {
  const refresh = useRefreshAll();
  const confirm = api.onboarding.confirmBenefits.useMutation({
    onSuccess: async () => {
      toast.success("Ciência confirmada");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const b = data.benefits;
  return (
    <div className="grid gap-10">
      <section aria-labelledby="politicas" className="grid gap-4">
        <SectionHeader id="politicas" title="Políticas" as="h2" description="Leia o resumo, abra o texto completo se quiser e registre o seu aceite." />
        {data.policies.map((p) => (
          <PolicyCard key={p.id} p={p} />
        ))}
      </section>
      <section aria-labelledby="beneficios" className="grid gap-4">
        <SectionHeader id="beneficios" title="Benefícios" as="h2" />
        {b.plans.length === 0 ? <p className="text-ink-soft">Nenhum benefício ativo para o seu regime.</p> : null}
        {b.plans.map((plan) => (
          <Card key={plan.id} className="gap-3">
            <div className="flex items-center gap-2">
              <HeartPulse aria-hidden className="size-5" strokeWidth={1.75} />
              <h3 className="font-semibold">{plan.providerName}</h3>
            </div>
            <p className="text-meta text-ink-soft">
              {plan.category === "saude" ? "Plano de saúde" : plan.category === "odonto" ? "Plano odontológico" : "Benefício"}. Vigente desde{" "}
              {formatDate(plan.validFrom)}. Elegível para {plan.eligibleRegimes.join(" e ")}.
            </p>
            {plan.isExample ? <ExampleContentNotice /> : null}
            <Markdown>{plan.summaryMd}</Markdown>
            <h4 className="font-semibold">Como usar</h4>
            <Markdown>{plan.howToUseMd}</Markdown>
            {plan.videoUrl ? (
              <a href={plan.videoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 underline underline-offset-4">
                <PlayCircle aria-hidden className="size-4" />
                Vídeo explicativo
              </a>
            ) : null}
          </Card>
        ))}
        {b.confirmed ? (
          <StatusBadge kind="task" status="concluida" label="Ciência confirmada" />
        ) : b.taskStatus === "disponivel" ? (
          <Button className="w-fit" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
            Confirmar ciência
          </Button>
        ) : null}
      </section>
    </div>
  );
}
