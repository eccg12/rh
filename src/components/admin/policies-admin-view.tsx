"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublishPolicyInputSchema } from "@/domain/inputs";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api, type RouterOutputs } from "@/trpc/react";

import { EditorSheet, Field, firstErrors } from "./form-bits";

type AdminPolicy = RouterOutputs["admin"]["policies"][number];

function PublishSheet({ policy, today, onClose }: { policy: AdminPolicy; today: string; onClose: () => void }) {
  const refresh = useRefreshAll();
  const ids = { summary: useId(), changelog: useId(), date: useId(), body: useId(), example: useId() };
  const [summary, setSummary] = useState(policy.summary);
  const [changelog, setChangelog] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [bodyMd, setBodyMd] = useState(policy.bodyMd);
  const [isExample, setIsExample] = useState(policy.isExample);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const publish = api.admin.publishPolicy.useMutation({
    onSuccess: async (next) => {
      toast.success("Nova versão publicada", {
        description: next.requiresAck
          ? `${next.title} versão ${next.version}. Quem já tinha aceitado recebe o aviso e o re-aceite fica pendente.`
          : `${next.title} versão ${next.version}. As pessoas recebem o aviso por e-mail.`,
      });
      onClose();
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const parsed = PublishPolicyInputSchema.safeParse({ policyId: policy.id, summary, changelog, effectiveFrom, bodyMd });
    if (!parsed.success) {
      setErrors(firstErrors(z.flattenError(parsed.error).fieldErrors));
      return;
    }
    setErrors({});
    publish.mutate({ ...parsed.data, isExample });
  };
  return (
    <EditorSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Publicar nova versão: ${policy.title}`}
      description={`A versão ${policy.version + 1} substitui a ${policy.version}. A regra A18 avisa as pessoas${policy.requiresAck ? " e cria o re-aceite" : ""}.`}
      submitLabel="Publicar nova versão"
      pending={publish.isPending}
      onSubmit={submit}
    >
      <Field id={ids.changelog} label="O que mudou" hint="Aparece no e-mail e no histórico de versões." error={errors.changelog}>
        <Textarea id={ids.changelog} rows={2} value={changelog} onChange={(e) => setChangelog(e.target.value)} aria-invalid={!!errors.changelog} />
      </Field>
      <Field id={ids.summary} label="Resumo" error={errors.summary}>
        <Textarea id={ids.summary} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} aria-invalid={!!errors.summary} />
      </Field>
      <Field id={ids.date} label="Vigente a partir de" error={errors.effectiveFrom}>
        <Input id={ids.date} type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-48" />
      </Field>
      <Field id={ids.body} label="Texto da política (Markdown)" error={errors.bodyMd}>
        <Textarea id={ids.body} rows={16} value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} aria-invalid={!!errors.bodyMd} />
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

export function PoliciesAdminView({ today }: { today: string }) {
  const [policies] = api.admin.policies.useSuspenseQuery();
  const [editing, setEditing] = useState<string | null>(null);
  const current = policies.find((p) => p.id === editing);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">
        A versão nova vale para todos: quem já aceitou a anterior vê o re-aceite pendente e recebe o aviso por e-mail.{" "}
        <Link href="/politicas-beneficios?aba=aceites" className="underline underline-offset-4">
          Ver a matriz de aceites
        </Link>
      </p>
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {policies.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <Link href={`/politicas-beneficios/${p.id}`} className="w-fit font-semibold underline-offset-4 hover:underline">
                {p.title}
              </Link>
              <p className="text-meta text-ink-soft">
                Versão {p.version}, vigente desde {formatDate(p.effectiveFrom)}. {p.requiresAck ? "Pede aceite." : "Só leitura."}
              </p>
              {p.changelog ? <p className="text-meta">Última mudança: {p.changelog}</p> : null}
              {p.isExample ? <ExampleContentNotice className="mt-1" /> : null}
            </div>
            <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              {p.requiresAck ? (
                p.pending > 0 ? (
                  <StatusBadge kind="ack" status="pendente" label={plural(p.pending, "aceite pendente", "aceites pendentes")} />
                ) : (
                  <StatusBadge kind="ack" status="aceita" label="Aceites em dia" />
                )
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setEditing(p.id)}>
                Publicar nova versão
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {current ? <PublishSheet key={current.id + current.version} policy={current} today={today} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
