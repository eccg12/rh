"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ChangeBenefitInputSchema } from "@/domain/inputs";
import type { BenefitCategory, Regime } from "@/domain/schemas";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

import { EditorSheet, Field, firstErrors } from "./form-bits";

const CATEGORY_LABELS: Record<BenefitCategory, string> = { saude: "Plano de saúde", odonto: "Plano odontológico", outros: "Outro benefício" };
const REGIMES: Regime[] = ["PJ", "CLT"];

function ChangeSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const refresh = useRefreshAll();
  const ids = {
    category: useId(),
    provider: useId(),
    date: useId(),
    summary: useId(),
    howTo: useId(),
    video: useId(),
    example: useId(),
  };
  const [category, setCategory] = useState<BenefitCategory>("saude");
  const [providerName, setProviderName] = useState("");
  const [validFrom, setValidFrom] = useState(today);
  const [summaryMd, setSummaryMd] = useState("");
  const [howToUseMd, setHowToUseMd] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [eligibleRegimes, setEligibleRegimes] = useState<Regime[]>(["PJ", "CLT"]);
  const [isExample, setIsExample] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const change = api.admin.changeBenefit.useMutation({
    onSuccess: async (plan) => {
      toast.success("Provedor trocado", {
        description: `${plan.providerName} a partir de ${formatDate(plan.validFrom)}. O aviso saiu para quem é elegível e o assistente já responde com o novo plano.`,
      });
      onClose();
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const parsed = ChangeBenefitInputSchema.safeParse({ category, providerName, validFrom, summaryMd, howToUseMd, videoUrl, eligibleRegimes });
    if (!parsed.success) {
      setErrors(firstErrors(z.flattenError(parsed.error).fieldErrors));
      return;
    }
    setErrors({});
    change.mutate({ ...parsed.data, isExample });
  };
  return (
    <EditorSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Trocar provedor"
      description="O provedor atual vai para o histórico. A regra A19 avisa quem é elegível e o assistente passa a responder com o novo plano."
      submitLabel="Trocar provedor"
      pending={change.isPending}
      onSubmit={submit}
    >
      <Field id={ids.category} label="Benefício">
        <Select value={category} onValueChange={(v) => setCategory(v as BenefitCategory)}>
          <SelectTrigger id={ids.category} className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_LABELS) as BenefitCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id={ids.provider} label="Novo provedor" error={errors.providerName}>
          <Input id={ids.provider} value={providerName} onChange={(e) => setProviderName(e.target.value)} aria-invalid={!!errors.providerName} />
        </Field>
        <Field id={ids.date} label="Vigente a partir de" error={errors.validFrom}>
          <Input id={ids.date} type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </Field>
      </div>
      <fieldset className="min-w-0 flex flex-col gap-2">
        <legend className="mb-1.5 text-ui font-medium">Elegível para</legend>
        <div className="flex gap-6">
          {REGIMES.map((r) => {
            const id = `${ids.category}-${r}`;
            return (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={eligibleRegimes.includes(r)}
                  onCheckedChange={(v) => setEligibleRegimes((prev) => (v === true ? [...new Set([...prev, r])] : prev.filter((x) => x !== r)))}
                />
                <Label htmlFor={id} className="font-normal">
                  {r}
                </Label>
              </div>
            );
          })}
        </div>
        {errors.eligibleRegimes ? (
          <p className="text-meta text-stop" role="alert">
            {errors.eligibleRegimes}
          </p>
        ) : null}
      </fieldset>
      <Field id={ids.summary} label="Resumo (Markdown)" hint="Cobertura, rede e o que muda para quem já usa." error={errors.summaryMd}>
        <Textarea id={ids.summary} rows={4} value={summaryMd} onChange={(e) => setSummaryMd(e.target.value)} aria-invalid={!!errors.summaryMd} />
      </Field>
      <Field id={ids.howTo} label="Como usar (Markdown)" hint="Um passo por linha, numerado." error={errors.howToUseMd}>
        <Textarea
          id={ids.howTo}
          rows={6}
          value={howToUseMd}
          placeholder={"1. Baixe o aplicativo…\n2. …"}
          onChange={(e) => setHowToUseMd(e.target.value)}
          aria-invalid={!!errors.howToUseMd}
        />
      </Field>
      <Field id={ids.video} label="Vídeo explicativo (opcional)" error={errors.videoUrl}>
        <Input id={ids.video} type="url" value={videoUrl} placeholder="https://" onChange={(e) => setVideoUrl(e.target.value)} />
      </Field>
      <div className="flex items-start gap-2">
        <Checkbox id={ids.example} checked={isExample} onCheckedChange={(v) => setIsExample(v === true)} className="mt-0.5" />
        <Label htmlFor={ids.example} className="leading-snug font-normal">
          Conteúdo de exemplo (mostra o aviso &quot;substituir pelo documento oficial&quot;)
        </Label>
      </div>
    </EditorSheet>
  );
}

export function BenefitsAdminView({ today }: { today: string }) {
  const [plans] = api.admin.benefits.useSuspenseQuery();
  const [changing, setChanging] = useState(false);
  const active = plans.filter((p) => p.active);
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="ativos" className="flex max-w-[860px] flex-col gap-4">
        <SectionHeader
          id="ativos"
          title="Provedores ativos"
          actions={<Button onClick={() => setChanging(true)}>Trocar provedor</Button>}
        />
        {active.map((p) => (
          <Card key={p.id} className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-section font-semibold">{p.providerName}</h3>
                <p className="text-meta text-ink-soft">
                  {CATEGORY_LABELS[p.category]}, vigente desde {formatDate(p.validFrom)}. Elegível para {p.eligibleRegimes.join(" e ")}.
                </p>
              </div>
              <StatusBadge kind="access" status="liberado" label="Ativo" />
            </div>
            {p.isExample ? <ExampleContentNotice /> : null}
          </Card>
        ))}
      </section>
      <section aria-labelledby="historico" className="flex max-w-[860px] flex-col gap-4">
        <SectionHeader id="historico" title="Histórico" description="Todos os provedores, do mais recente ao mais antigo." />
        <div className="rounded-lg border border-rule bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Provedor</TableHead>
                <TableHead scope="col">Benefício</TableHead>
                <TableHead scope="col">Vigência</TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="py-3 font-medium">{p.providerName}</TableCell>
                  <TableCell className="py-3">{CATEGORY_LABELS[p.category]}</TableCell>
                  <TableCell className="py-3">
                    {formatDate(p.validFrom)}
                    {p.validUntil ? ` a ${formatDate(p.validUntil)}` : " em diante"}
                  </TableCell>
                  <TableCell className="py-3">
                    {p.active ? <StatusBadge kind="access" status="liberado" label="Ativo" /> : <StatusBadge kind="task" status="dispensada" label="Anterior" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      {changing ? <ChangeSheet today={today} onClose={() => setChanging(false)} /> : null}
    </div>
  );
}
