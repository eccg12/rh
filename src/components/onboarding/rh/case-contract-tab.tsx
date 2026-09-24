"use client";

import { FileSignature, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseDetail } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

export function CaseContractTab({ data }: { data: CaseDetail }) {
  const contract = data.contract;
  const refresh = useRefreshAll();
  const [mode, setMode] = useState<"modelo" | "customizado">(contract?.mode ?? data.case.contractMode);
  const [templateId, setTemplateId] = useState(contract?.templateId ?? data.templates[0]?.id ?? "");
  const [fileName, setFileName] = useState(contract?.fileName ?? "");
  const send = api.onboarding.sendContract.useMutation({
    onSuccess: async () => {
      toast.success("Contrato enviado para assinatura");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  if (!contract) return <EmptyState icon={FileSignature} title="Contrato não encontrado" />;

  const rows: [string, React.ReactNode][] = [
    ["Modo", contract.mode === "customizado" ? "Contrato customizado" : "Modelo"],
    [contract.mode === "customizado" ? "Arquivo" : "Modelo", contract.mode === "customizado" ? (contract.fileName ?? "Ainda não anexado") : (contract.templateName ?? "—")],
    ["Status", <StatusBadge key="s" kind="contract" status={contract.taskStatus === "bloqueada" && contract.status === "rascunho" ? "nao_iniciado" : contract.status} />],
    ["Enviado em", contract.sentAt ? formatDateTime(contract.sentAt) : "—"],
    ["Assinado em", contract.signedAt ? formatDateTime(contract.signedAt) : "—"],
    ["Código de verificação", contract.verificationCode ?? "—"],
    ["Envelope", contract.signatureRef ?? "—"],
  ];

  return (
    <div className="grid max-w-[720px] gap-6">
      <dl className="divide-y divide-rule border-y border-rule">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr]">
            <dt className="text-meta font-medium text-ink-soft">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {contract.status === "recusado" ? (
        <p className="rounded-md bg-stop-soft px-3 py-2 text-stop">
          {data.person.firstName} recusou o contrato: {contract.declineReason}. Ajuste e envie de novo.
        </p>
      ) : null}

      {contract.canSend ? (
        <section className="grid gap-4 rounded-lg border border-rule bg-surface p-5">
          <h3 className="font-semibold">Preparar e enviar</h3>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex flex-wrap gap-6" aria-label="Tipo de contrato">
            <label className="flex items-center gap-2">
              <RadioGroupItem value="modelo" /> Usar modelo
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="customizado" /> Contrato customizado
            </label>
          </RadioGroup>
          {mode === "modelo" ? (
            <div className="grid gap-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="modelo">
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {data.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="arquivo-contrato">Contrato customizado</Label>
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-control px-3 py-2 hover:bg-tint focus-within:outline-2 focus-within:outline-ink">
                <Paperclip aria-hidden className="size-4" />
                {fileName || "Anexar arquivo (PDF)"}
                <input
                  id="arquivo-contrato"
                  type="file"
                  accept="application/pdf,.pdf,.docx"
                  className="sr-only"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />
              </label>
              <span className="text-meta text-ink-soft">Na Fase 0, guardamos só o nome do arquivo.</span>
            </div>
          )}
          <Button
            className="w-fit"
            disabled={send.isPending || (mode === "modelo" ? !templateId : !fileName)}
            onClick={() => send.mutate({ caseId: data.case.id, mode, templateId: mode === "modelo" ? templateId : undefined, fileName: mode === "customizado" ? fileName : undefined })}
          >
            <Send aria-hidden />
            Enviar para assinatura
          </Button>
          <p className="text-meta text-ink-soft">Assinatura simulada: nenhum documento real é enviado.</p>
        </section>
      ) : contract.status === "rascunho" ? (
        <p className="text-ink-soft">O contrato é liberado para envio quando todos os documentos obrigatórios forem aprovados.</p>
      ) : null}
    </div>
  );
}
