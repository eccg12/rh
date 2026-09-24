"use client";

import { CalendarCheck, FileUp, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { DemoShortcut } from "@/components/common/demo-only";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type DocsData = Extract<StageData, { kind: "cadastro-documentos" }>;
type DocItem = DocsData["documents"]["items"][number];

const LEVEL = { obrigatorio: "Obrigatório", condicional: "Condicional", opcional: "Opcional" } as const;
const EXT: Record<string, string[]> = { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] };
const LABEL: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

/** Mesma checagem do servidor, para o erro aparecer antes do envio. */
function checkClient(file: File, accept: string[], maxSizeMb: number): string | null {
  const name = file.name.toLowerCase();
  const okFormat = accept.includes(file.type) || accept.some((m) => (EXT[m] ?? []).some((e) => name.endsWith(e)));
  const formats = accept.map((m) => LABEL[m] ?? m).join(", ");
  if (!okFormat) return `Formato não aceito. Envie ${formats}.`;
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `O arquivo tem ${formatBytes(file.size)}. O limite é ${maxSizeMb} MB: envie em PDF ou reduza a resolução.`;
  }
  return null;
}

function UploadZone({
  inputId,
  accept,
  maxSizeMb,
  disabled,
  label,
  onFile,
}: {
  inputId: string;
  accept: string[];
  maxSizeMb: number;
  disabled?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const extensions = accept.flatMap((m) => EXT[m] ?? []).join(",");
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !disabled) onFile(file);
      }}
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-dashed border-control p-3 sm:flex-row sm:items-center",
        over && "border-ink bg-tint",
        disabled && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={[...accept, extensions].join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden />
        {label}
      </Button>
      <span className="text-meta text-ink-soft">
        ou arraste o arquivo aqui. {accept.map((m) => LABEL[m] ?? m).join(", ")}, até {maxSizeMb} MB.
      </span>
    </div>
  );
}

function DocumentCard({ item, canSubmit }: { item: DocItem; canSubmit: boolean }) {
  const refresh = useRefreshAll();
  const [error, setError] = useState<string | null>(null);
  const submit = api.onboarding.submitDocument.useMutation({
    onSuccess: async () => {
      setError(null);
      toast.success("Documento enviado");
      await refresh();
    },
    onError: (e) => setError(e.message),
  });
  const current = item.current;
  const canUpload = canSubmit && current?.status !== "aprovado";
  const onFile = (file: File) => {
    const problem = checkClient(file, item.accept, item.maxSizeMb);
    if (problem) {
      setError(problem);
      return;
    }
    submit.mutate({ requirementId: item.requirementId, file: { fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size } });
  };

  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-semibold leading-snug">{item.title}</h3>
          <p className="text-meta text-ink-soft">
            {LEVEL[item.level]}
            {item.conditionNote ? `. ${item.conditionNote}` : ""}
          </p>
        </div>
        <StatusBadge kind="document" status={current?.status ?? "nao_enviado"} />
      </div>
      <p className="text-ink-soft">{item.description}</p>
      {current ? (
        <p className="flex items-center gap-2 text-meta">
          <FileUp aria-hidden className="size-4 text-ink-soft" />
          <span className="min-w-0 truncate">
            {current.fileName}, {formatBytes(current.sizeBytes)}. Enviado em {formatDateTime(current.submittedAt)}.
          </span>
        </p>
      ) : null}
      {current?.status === "rejeitado" ? (
        <p className="rounded-md bg-stop-soft px-3 py-2 text-meta text-stop">
          Não pudemos aprovar: {current.rejectionReason}. Envie de novo, por favor.
        </p>
      ) : null}
      {canUpload ? (
        <UploadZone
          inputId={`doc-${item.requirementId}`}
          accept={item.accept}
          maxSizeMb={item.maxSizeMb}
          disabled={submit.isPending}
          label={current ? (current.status === "rejeitado" ? "Enviar novamente" : "Trocar arquivo") : "Enviar arquivo"}
          onFile={onFile}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-meta text-stop">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

export function DocumentsSection({ data }: { data: DocsData }) {
  const refresh = useRefreshAll();
  const docs = data.documents;
  const simulate = api.onboarding.simulateDocuments.useMutation({
    onSuccess: async (r) => {
      toast.success(r.sent ? "Documentos enviados" : "Nada a enviar", {
        description: r.sent ? `${r.sent} arquivos de exemplo foram enviados.` : "Todos os obrigatórios já estão enviados.",
      });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const order = { obrigatorio: 0, condicional: 1, opcional: 2 };
  const items = [...docs.items].sort((a, b) => order[a.level] - order[b.level]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular-nums">
          <strong className="font-semibold">
            {docs.summary.submitted} de {docs.summary.required}
          </strong>{" "}
          obrigatórios enviados{docs.summary.approved ? `, ${docs.summary.approved} aprovados` : ""}.
        </p>
        {docs.canSubmit ? (
          <DemoShortcut onClick={() => simulate.mutate()} disabled={simulate.isPending}>
            Simular envio de todos
          </DemoShortcut>
        ) : null}
      </div>
      <div className="grid gap-4">
        {items.map((item) => (
          <DocumentCard key={item.requirementId} item={item} canSubmit={docs.canSubmit} />
        ))}
      </div>
    </div>
  );
}

export function ExamSection({ data }: { data: DocsData }) {
  const refresh = useRefreshAll();
  const [error, setError] = useState<string | null>(null);
  const submit = api.onboarding.submitDocument.useMutation({
    onSuccess: async () => {
      setError(null);
      toast.success("ASO enviado");
      await refresh();
    },
    onError: (e) => setError(e.message),
  });
  const exam = data.exam;
  if (!exam) return null;
  const accept = ["application/pdf", "image/jpeg", "image/png"];
  return (
    <section aria-labelledby="exame" className="grid gap-3">
      <h2 id="exame" className="text-section font-semibold">
        Exame admissional
      </h2>
      {exam.examDate ? (
        <p className="flex items-center gap-2">
          <CalendarCheck aria-hidden className="size-4" />
          Agendado para {formatDate(exam.examDate)}, {exam.clinic}.
        </p>
      ) : (
        <p className="text-ink-soft">O RH agenda o exame depois que você enviar a ficha. Você recebe a data e a clínica aqui.</p>
      )}
      {exam.aso ? (
        <p className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="document" status={exam.aso.status} /> ASO enviado: {exam.aso.fileName}
        </p>
      ) : exam.asoStatus === "disponivel" ? (
        <UploadZone
          inputId="doc-aso"
          accept={accept}
          maxSizeMb={10}
          disabled={submit.isPending}
          label="Enviar ASO"
          onFile={(file) => {
            const problem = checkClient(file, accept, 10);
            if (problem) return setError(problem);
            submit.mutate({ requirementId: "aso", file: { fileName: file.name, mimeType: file.type, sizeBytes: file.size } });
          }}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-meta text-stop">
          {error}
        </p>
      ) : null}
      {exam.asoStatus === "disponivel" ? (
        <p className="flex items-center gap-2 text-meta text-ink-soft">
          <RotateCcw aria-hidden className="size-3.5" />
          Depois do exame, a clínica entrega o ASO. Envie o arquivo aqui.
        </p>
      ) : null}
    </section>
  );
}
