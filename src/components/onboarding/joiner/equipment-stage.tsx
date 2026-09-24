"use client";

import { Laptop, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

type EquipmentData = Extract<StageData, { kind: "equipamentos-acessos" }>;

const PREPARING = "Estamos preparando. Você recebe um e-mail quando estiver pronto.";

export function EquipmentStage({ data }: { data: EquipmentData }) {
  const refresh = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const accept = api.onboarding.acceptTerm.useMutation({
    onSuccess: async () => {
      toast.success("Termo aceito");
      setOpen(false);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const nb = data.notebook;
  const granted = data.accesses.filter((a) => a.status === "liberado").length;

  return (
    <div className="grid grid-cols-1 gap-10">
      <section aria-labelledby="email" className="grid grid-cols-1 gap-2">
        <SectionHeader id="email" title="E-mail corporativo" as="h2" />
        {data.corporateEmail.value ? (
          <p className="flex flex-wrap items-center gap-2">
            <Mail aria-hidden className="size-4" />
            <span className="font-medium">{data.corporateEmail.value}</span>
            <StatusBadge kind="access" status="liberado" label="Criado" />
          </p>
        ) : (
          <p className="text-ink-soft">{data.corporateEmail.taskStatus === "bloqueada" ? "Criado depois da assinatura do contrato." : PREPARING}</p>
        )}
      </section>

      {data.needsNotebook ? (
        <section aria-labelledby="notebook" className="grid grid-cols-1 gap-3">
          <SectionHeader id="notebook" title="Notebook" as="h2" />
          {nb ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <Laptop aria-hidden className="size-4" />
                <span className="font-medium">{nb.model}</span>
                <span className="text-meta text-ink-soft">patrimônio {nb.assetTag}</span>
              </p>
              {nb.termAcceptedAt ? (
                <p className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="ack" status="aceita" label="Termo aceito" />
                  <span className="text-meta text-ink-soft">{formatDateTime(nb.termAcceptedAt)}</span>
                </p>
              ) : (
                <Button className="w-fit" onClick={() => setOpen(true)}>
                  Ler e aceitar termo
                </Button>
              )}
            </>
          ) : (
            <p className="text-ink-soft">{PREPARING}</p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="acessos" className="grid grid-cols-1 gap-3">
        <SectionHeader
          id="acessos"
          title="Acessos"
          as="h2"
          description={data.accessTaskStatus === "bloqueada" ? "Liberados depois da assinatura do contrato." : `${granted} de ${data.accesses.length} liberados.`}
        />
        <ul className="divide-y divide-rule border-y border-rule">
          {data.accesses.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-medium">{a.system}</span>
              <StatusBadge kind="access" status={a.status} />
            </li>
          ))}
        </ul>
        {granted < data.accesses.length && data.accessTaskStatus !== "bloqueada" ? <p className="text-meta text-ink-soft">{PREPARING}</p> : null}
      </section>

      {nb && data.term ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{data.term.title}</DialogTitle>
              <DialogDescription>
                {nb.model}, patrimônio {nb.assetTag}, série {nb.serial}. Versão {data.term.version} do termo.
              </DialogDescription>
            </DialogHeader>
            {data.term.isExample ? <ExampleContentNotice /> : null}
            <Markdown>{data.term.bodyMd}</Markdown>
            <div className="flex items-start gap-2.5">
              <Checkbox id="li-termo" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <Label htmlFor="li-termo" className="text-ui leading-snug font-medium">
                Li e aceito o termo de responsabilidade
              </Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={!agree || accept.isPending} onClick={() => accept.mutate({ equipmentId: nb.id })}>
                Aceitar termo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
