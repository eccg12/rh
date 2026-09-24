"use client";

import { Check, Laptop, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseDetail } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

const OWNER = { rh: "RH", ti: "TI", gestor: "Gestor" } as const;
const open = (s: string) => s === "disponivel" || s === "em_andamento";

export function CaseEquipmentTab({ data }: { data: CaseDetail }) {
  const eq = data.equipment;
  const refresh = useRefreshAll();
  const [email, setEmail] = useState(eq.suggestedEmail);
  const [notebookId, setNotebookId] = useState(eq.availableNotebooks[0]?.id ?? "");
  const onError = (e: { message: string }) => toast.error(e.message);
  const setCorporate = api.onboarding.setCorporateEmail.useMutation({
    onSuccess: async () => {
      toast.success("E-mail corporativo criado");
      await refresh();
    },
    onError,
  });
  const assign = api.onboarding.assignNotebook.useMutation({
    onSuccess: async () => {
      toast.success("Notebook atribuído", { description: "O termo de responsabilidade saiu automaticamente." });
      await refresh();
    },
    onError,
  });
  const grant = api.onboarding.grantAccess.useMutation({
    onSuccess: async () => {
      toast.success("Acesso liberado");
      await refresh();
    },
    onError,
  });
  const blockedNote = "Liberado depois da assinatura do contrato.";

  return (
    <div className="grid grid-cols-1 max-w-[820px] gap-10">
      <section>
        <SectionHeader title="E-mail corporativo" as="h3" />
        {eq.corporateEmail ? (
          <p className="flex items-center gap-2">
            <Mail aria-hidden className="size-4" />
            <span className="font-medium">{eq.corporateEmail}</span>
            <StatusBadge kind="access" status="liberado" label="Criado" />
          </p>
        ) : open(eq.emailTask) ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid grid-cols-1 min-w-64 flex-1 gap-2">
              <Label htmlFor="email-corporativo">Endereço (Google Workspace)</Label>
              <Input id="email-corporativo" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button variant="signal" disabled={setCorporate.isPending} onClick={() => setCorporate.mutate({ caseId: data.case.id, email })}>
              <Check aria-hidden />
              Marcar como criado
            </Button>
          </div>
        ) : (
          <p className="text-ink-soft">{blockedNote}</p>
        )}
      </section>

      <section>
        <SectionHeader title="Notebook" as="h3" />
        {!data.case.needsNotebook ? (
          <p className="text-ink-soft">Esta pessoa não precisa de notebook da Monoda.</p>
        ) : eq.notebook ? (
          <div className="grid grid-cols-1 gap-1">
            <p className="flex flex-wrap items-center gap-2">
              <Laptop aria-hidden className="size-4" />
              <span className="font-medium">{eq.notebook.assetTag}</span>
              <span>{eq.notebook.model}</span>
              <span className="text-meta text-ink-soft">série {eq.notebook.serial}</span>
            </p>
            <p className="text-meta text-ink-soft">
              {eq.notebook.termAcceptedAt
                ? `Termo aceito em ${formatDateTime(eq.notebook.termAcceptedAt)} (versão ${eq.notebook.termVersion ?? 1}).`
                : "Termo de responsabilidade pendente com quem entra."}
            </p>
          </div>
        ) : open(eq.notebookTask) ? (
          eq.availableNotebooks.length === 0 ? (
            <p className="text-stop">Não há notebook disponível no inventário. Cadastre um em Equipamentos e acessos.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid grid-cols-1 min-w-64 flex-1 gap-2">
                <Label htmlFor="notebook">Notebook disponível</Label>
                <Select value={notebookId} onValueChange={setNotebookId}>
                  <SelectTrigger id="notebook">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eq.availableNotebooks.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.assetTag}, {n.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="signal" disabled={!notebookId || assign.isPending} onClick={() => assign.mutate({ caseId: data.case.id, equipmentId: notebookId })}>
                <Laptop aria-hidden />
                Atribuir notebook
              </Button>
            </div>
          )
        ) : (
          <p className="text-ink-soft">{blockedNote}</p>
        )}
      </section>

      <section>
        <SectionHeader title="Acessos" as="h3" description={open(eq.accessTask) || eq.accessTask === "concluida" ? undefined : blockedNote} />
        <ul className="divide-y divide-rule border-y border-rule">
          {eq.accesses.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{a.system}</span>
                <span className="text-meta text-ink-soft">
                  Responsável: {OWNER[a.owner]}
                  {a.grantedAt ? `. Liberado em ${formatDateTime(a.grantedAt)}` : ""}
                </span>
              </span>
              <StatusBadge kind="access" status={a.status} />
              {a.status === "pendente" && open(eq.accessTask) ? (
                <Button size="sm" variant="signal" disabled={grant.isPending} onClick={() => grant.mutate({ grantId: a.id })}>
                  Marcar como liberado
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
