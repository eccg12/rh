"use client";

import { Check, CircleCheck, CircleX, FileText, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentSubmission } from "@/domain/schemas";
import type { CaseDetail } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatAgo, formatDateTime } from "@/lib/dates";
import { formatBytes } from "@/lib/format";
import { api } from "@/trpc/react";

const LEVEL_LABEL = { obrigatorio: "Obrigatório", condicional: "Condicional", opcional: "Opcional" } as const;
const MIME_LABEL: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

function RejectDialog({ doc, title, reasons, open, onOpenChange }: { doc: DocumentSubmission; title: string; reasons: string[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [reason, setReason] = useState(reasons[0] ?? "Outro");
  const [other, setOther] = useState("");
  const refresh = useRefreshAll();
  const review = api.onboarding.reviewDocument.useMutation({
    onSuccess: async () => {
      toast.success("Documento rejeitado", { description: "O e-mail com o motivo saiu automaticamente." });
      onOpenChange(false);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const finalReason = reason === "Outro" ? other.trim() : reason;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar documento</DialogTitle>
          <DialogDescription>
            {title}. A pessoa recebe o motivo por e-mail, com o link para enviar de novo.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} aria-label="Motivo da rejeição">
          {reasons.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} /> {r}
            </label>
          ))}
        </RadioGroup>
        {reason === "Outro" ? (
          <div className="grid gap-2">
            <Label htmlFor="motivo-outro">Descreva o motivo</Label>
            <Textarea id="motivo-outro" value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!finalReason || review.isPending}
            onClick={() => review.mutate({ documentId: doc.id, decision: "rejeitar", reason: finalReason })}
          >
            Rejeitar documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionBlock({ doc, now }: { doc: DocumentSubmission; now: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div
        aria-hidden
        className="flex h-24 w-full shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-rule bg-paper text-ink-soft sm:w-20"
      >
        <FileText className="size-6" strokeWidth={1.5} />
        <span className="text-[11px]">{MIME_LABEL[doc.mimeType] ?? "Arquivo"}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{doc.fileName}</span>
        <span className="text-meta text-ink-soft tabular-nums">
          {formatBytes(doc.sizeBytes)}, {MIME_LABEL[doc.mimeType] ?? doc.mimeType}. Enviado {formatAgo(doc.submittedAt, now)} ({formatDateTime(doc.submittedAt)})
        </span>
        <span className="text-meta text-ink-soft">Prévia indisponível: na Fase 0 o upload guarda só os dados do arquivo.</span>
        {doc.autoCheck ? (
          <ul className="mt-1 grid gap-1 text-meta" aria-label="Checagem automática">
            {doc.autoCheck.notes.map((n) => (
              <li key={n} className="flex items-start gap-1.5">
                {doc.autoCheck?.formatOk && doc.autoCheck.sizeOk ? (
                  <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ok" />
                ) : (
                  <CircleX aria-hidden className="mt-0.5 size-3.5 shrink-0 text-stop" />
                )}
                {n}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function CaseDocumentsTab({ data }: { data: CaseDetail }) {
  const refresh = useRefreshAll();
  const [rejecting, setRejecting] = useState<{ doc: DocumentSubmission; title: string } | null>(null);
  const approve = api.onboarding.reviewDocument.useMutation({
    onSuccess: async () => {
      toast.success("Documento aprovado");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const s = data.documents.summary;
  const items = [...data.documents.items].sort((a, b) => {
    const order = { obrigatorio: 0, condicional: 1, opcional: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="grid gap-5">
      <p className="tabular-nums">
        <strong className="font-semibold">
          {s.requiredApproved} de {s.required}
        </strong>{" "}
        obrigatórios aprovados. {s.pendingReview > 0 ? `${s.pendingReview} para revisar. ` : ""}
        {s.rejected > 0 ? `${s.rejected} aguardando reenvio.` : ""}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <Card key={item.requirementId} className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold leading-snug">{item.title}</h3>
                <span className="text-meta text-ink-soft">
                  {LEVEL_LABEL[item.level]}
                  {item.conditionNote ? `. ${item.conditionNote}` : ""}
                </span>
              </div>
              <StatusBadge kind="document" status={item.current?.status ?? "nao_enviado"} />
            </div>
            {item.current ? (
              <>
                <SubmissionBlock doc={item.current} now={data.now} />
                {item.current.status === "rejeitado" ? (
                  <p className="rounded-md bg-stop-soft px-3 py-2 text-meta text-stop">
                    Rejeitado: {item.current.rejectionReason}. Aguardando novo envio.
                  </p>
                ) : null}
                {item.current.status === "enviado" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate({ documentId: item.current!.id, decision: "aprovar" })}
                    >
                      <Check aria-hidden />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting({ doc: item.current!, title: item.title })}>
                      <X aria-hidden />
                      Rejeitar
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-meta text-ink-soft">{item.level === "obrigatorio" ? "Ainda não enviado." : "Não enviado (não é obrigatório)."}</p>
            )}
            {item.history.length > 0 ? (
              <details className="text-meta">
                <summary className="cursor-pointer text-ink-soft">Envios anteriores ({item.history.length})</summary>
                <ul className="mt-2 grid gap-1">
                  {item.history.map((h) => (
                    <li key={h.id}>
                      {h.fileName}, {formatDateTime(h.submittedAt)}
                      {h.rejectionReason ? `. Rejeitado: ${h.rejectionReason}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Card>
        ))}
        {data.documents.aso ? (
          <Card className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">ASO — atestado de saúde ocupacional</h3>
              <Badge variant="outline">Exame admissional</Badge>
            </div>
            <SubmissionBlock doc={data.documents.aso} now={data.now} />
          </Card>
        ) : null}
      </div>
      {rejecting ? (
        <RejectDialog
          doc={rejecting.doc}
          title={rejecting.title}
          reasons={data.documents.rejectionReasons}
          open={!!rejecting}
          onOpenChange={(v) => !v && setRejecting(null)}
        />
      ) : null}
    </div>
  );
}
