"use client";

import { Headphones, Laptop, Mail, Monitor, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { EquipmentType } from "@/domain/schemas";
import type { MyEquipmentItem } from "@/domain/services/equipment-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { api, type RouterOutputs } from "@/trpc/react";

const ICONS: Record<EquipmentType, typeof Laptop> = { notebook: Laptop, monitor: Monitor, headset: Headphones, outros: Package };

function TermDialog({ item, term }: { item: MyEquipmentItem; term: NonNullable<RouterOutputs["equipment"]["mine"]["term"]> }) {
  const refresh = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const checkboxId = `aceite-${item.id}`;
  const accept = api.equipment.acceptTerm.useMutation({
    onSuccess: async () => {
      toast.success("Termo aceito");
      setOpen(false);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-fit">Ler e aceitar termo</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{term.title}</DialogTitle>
          <DialogDescription>
            {item.name}, patrimônio {item.assetTag}, série {item.serial}.
          </DialogDescription>
        </DialogHeader>
        {term.isExample ? <ExampleContentNotice /> : null}
        <Markdown variant="chat">{term.bodyMd}</Markdown>
        <div className="flex items-start gap-2 border-t border-rule pt-4">
          <Checkbox id={checkboxId} checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <Label htmlFor={checkboxId} className="text-ui leading-snug font-medium">
            Li e aceito o termo de responsabilidade
          </Label>
        </div>
        <DialogFooter>
          <Button disabled={!agree || accept.isPending} onClick={() => accept.mutate({ equipmentId: item.id })}>
            Aceitar termo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyEquipmentView() {
  const [data] = api.equipment.mine.useSuspenseQuery();
  return (
    <div className="flex max-w-[860px] flex-col gap-12">
      <section aria-labelledby="meus-equipamentos" className="flex flex-col gap-4">
        <SectionHeader id="meus-equipamentos" title="Meus equipamentos" />
        {data.items.length === 0 ? (
          <EmptyState
            icon={Laptop}
            compact
            title={data.notebookPending ? "Estamos preparando o seu notebook" : "Nenhum equipamento com você"}
            description={
              data.notebookPending
                ? "Você recebe um e-mail quando ele estiver pronto, com o termo de responsabilidade para aceitar."
                : "Quando o RH atribuir um equipamento, ele aparece aqui com o termo de responsabilidade."
            }
          />
        ) : null}
        {data.items.map((item) => {
          const Icon = ICONS[item.type];
          return (
            <Card key={item.id} className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-meta text-ink-soft">
                      Patrimônio {item.assetTag}, série {item.serial}
                      {item.assignedAt ? `. Com você desde ${formatDate(item.assignedAt)}` : ""}.
                    </p>
                  </div>
                </div>
                {item.termAcceptedAt ? (
                  <StatusBadge kind="ack" status="aceita" label="Termo aceito" />
                ) : item.termRequired ? (
                  <StatusBadge kind="ack" status="pendente" label="Termo pendente" />
                ) : null}
              </div>
              {item.termAcceptedAt ? (
                <p className="text-meta text-ink-soft">
                  Termo de responsabilidade aceito em {formatDate(item.termAcceptedAt)}
                  {item.termVersion ? `, versão ${item.termVersion}` : ""}.
                </p>
              ) : item.termRequired && data.term ? (
                <TermDialog item={item} term={data.term} />
              ) : null}
            </Card>
          );
        })}
      </section>

      <section aria-labelledby="email-corporativo" className="flex flex-col gap-3">
        <SectionHeader id="email-corporativo" title="E-mail corporativo" />
        {data.corporateEmail ? (
          <p className="flex flex-wrap items-center gap-2">
            <Mail aria-hidden className="size-4" strokeWidth={1.75} />
            <span className="font-medium">{data.corporateEmail}</span>
            <StatusBadge kind="access" status="liberado" label="Criado" />
          </p>
        ) : (
          <p className="text-ink-soft">
            {data.emailPending
              ? "Estamos preparando. Você recebe um e-mail quando estiver pronto."
              : "Ainda sem e-mail corporativo. Fale com o RH."}
          </p>
        )}
      </section>

      <section aria-labelledby="meus-acessos" className="flex flex-col gap-3">
        <SectionHeader id="meus-acessos" title="Meus acessos" />
        {data.accesses.length === 0 ? (
          <p className="text-ink-soft">Nenhum acesso registrado ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
            {data.accesses.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="font-medium">{a.system}</span>
                  <span className="text-meta text-ink-soft">
                    {a.status === "liberado" && a.grantedAt
                      ? `Liberado em ${formatDate(a.grantedAt)}`
                      : `Responsável: ${a.ownerLabel}. Estamos preparando.`}
                  </span>
                </span>
                <StatusBadge kind="access" status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
