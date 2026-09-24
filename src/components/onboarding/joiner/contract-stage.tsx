"use client";

import { BadgeCheck, FileSignature, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

type ContractData = Extract<StageData, { kind: "contrato" }>;

export function ContractStage({ data }: { data: ContractData }) {
  const c = data.contract;
  const refresh = useRefreshAll();
  const [agree, setAgree] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const sign = api.onboarding.signContract.useMutation({
    onSuccess: async () => {
      toast.success("Contrato assinado");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const decline = api.onboarding.declineContract.useMutation({
    onSuccess: async () => {
      toast.success("Pedido de ajuste enviado ao RH");
      setDeclineOpen(false);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  if (!c) return null;

  if (c.status === "assinado") {
    return (
      <Card className="gap-3 border-ok/50">
        <p className="flex items-center gap-2 text-section font-semibold">
          <BadgeCheck aria-hidden className="size-5 text-ok" />
          Contrato assinado
        </p>
        <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-meta text-ink-soft">Documento</dt>
            <dd className="font-medium">{c.name}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-soft">Assinado em</dt>
            <dd className="tabular-nums">{c.signedAt ? formatDateTime(c.signedAt) : "—"}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-soft">Código de verificação</dt>
            <dd className="font-medium tabular-nums">{c.verificationCode}</dd>
          </div>
        </dl>
        <p className="text-meta text-ink-soft">Assinatura simulada na Fase 0: nenhum documento real foi assinado.</p>
      </Card>
    );
  }

  if (c.status !== "enviado") {
    return (
      <p className="flex flex-wrap items-center gap-2 text-ink-soft">
        <StatusBadge kind="contract" status={c.status === "recusado" ? "recusado" : "nao_iniciado"} />
        {c.status === "recusado"
          ? `Você pediu um ajuste: "${c.declineReason}". O RH vai revisar e enviar de novo.`
          : "O RH prepara o seu contrato depois da aprovação dos documentos. Você recebe um e-mail quando ele estiver pronto."}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="contract" status="enviado" /> Enviado em {c.sentAt ? formatDateTime(c.sentAt) : "—"}.
      </p>
      <Card className="gap-4">
        <div className="flex items-start gap-3">
          <FileSignature aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          <div className="flex flex-col gap-1">
            <h2 className="text-section font-semibold">Revisar e assinar</h2>
            <p className="text-ink-soft">{c.name}</p>
          </div>
        </div>
        {c.isExample ? <ExampleContentNotice text="Modelo de exemplo — substituir pelo contrato oficial" /> : null}
        <div className="grid h-56 place-items-center rounded-md border border-dashed border-rule bg-paper px-6 text-center text-meta text-ink-soft">
          Pré-visualização do contrato. Na Fase 0, o documento é um marcador: a assinatura eletrônica real entra na Fase 2.
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="li-contrato" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <Label htmlFor="li-contrato" className="text-ui leading-snug font-medium">
            Li e concordo com os termos do contrato
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={!agree || sign.isPending || !data.canSign} onClick={() => sign.mutate()}>
            Assinar contrato
          </Button>
          <Button size="lg" variant="outline" onClick={() => setDeclineOpen(true)}>
            <MessageSquareWarning aria-hidden />
            Pedir ajuste
          </Button>
        </div>
      </Card>
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir ajuste no contrato</DialogTitle>
            <DialogDescription>O contrato volta para o RH com a sua observação.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="ajuste">O que precisa mudar?</Label>
            <Textarea id="ajuste" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={reason.trim().length < 3 || decline.isPending} onClick={() => decline.mutate({ reason })}>
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
