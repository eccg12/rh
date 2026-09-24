"use client";

import { Eye, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import type { CaseDetail, MaskedField } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

function FieldValue({ caseId, field }: { caseId: string; field: MaskedField }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const refresh = useRefreshAll();
  const reveal = api.onboarding.revealSensitive.useMutation({
    onSuccess: async (r) => {
      setRevealed(r.value);
      toast.success("Dado exibido", { description: "O acesso foi registrado na auditoria." });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  if (!field.sensitive || field.display === "—") return <span>{field.display}</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tabular-nums">{revealed ?? field.display}</span>
      {revealed === null ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          disabled={reveal.isPending}
          onClick={() => reveal.mutate({ caseId, path: field.path })}
          aria-label={`Mostrar ${field.label}`}
        >
          <Eye aria-hidden />
          Mostrar
        </Button>
      ) : (
        <span className="text-meta text-ink-soft">acesso registrado</span>
      )}
    </span>
  );
}

export function CaseFormTab({ data }: { data: CaseDetail }) {
  if (!data.form || data.form.status !== "enviado") {
    return (
      <EmptyState
        icon={FileText}
        title="A ficha ainda não foi enviada"
        description={
          data.form?.status === "rascunho"
            ? `${data.person.firstName} começou a preencher e tem um rascunho salvo.`
            : `${data.person.firstName} recebe a ficha junto com as boas-vindas. Um lembrete sai sozinho se ela ficar parada.`
        }
      />
    );
  }
  return (
    <div className="grid gap-8">
      <p className="text-meta text-ink-soft">
        Enviada em {data.form.submittedAt ? formatDateTime(data.form.submittedAt) : "—"}. Dados sensíveis aparecem mascarados; ver o valor completo
        registra o acesso na auditoria.
      </p>
      {data.form.sections.map((section) => (
        <section key={section.id}>
          <SectionHeader title={section.title} as="h3" />
          <dl className="divide-y divide-rule border-y border-rule">
            {section.fields.map((f) =>
              f.items ? (
                <div key={f.id} className="grid gap-2 py-2.5 sm:grid-cols-[220px_1fr]">
                  <dt className="text-meta font-medium text-ink-soft">{f.label}</dt>
                  <dd className="grid gap-3">
                    {f.items.length === 0 ? "Nenhum" : null}
                    {f.items.map((item) => (
                      <dl key={item.index} className="grid gap-1 rounded-md border border-rule p-3">
                        {item.fields.map((sub) => (
                          <div key={sub.path} className="grid gap-1 sm:grid-cols-[160px_1fr]">
                            <dt className="text-meta text-ink-soft">{sub.label}</dt>
                            <dd>
                              <FieldValue caseId={data.case.id} field={sub} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ))}
                  </dd>
                </div>
              ) : (
                <div key={f.id} className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr]">
                  <dt className="text-meta font-medium text-ink-soft">{f.label}</dt>
                  <dd>
                    <FieldValue caseId={data.case.id} field={f} />
                  </dd>
                </div>
              ),
            )}
          </dl>
        </section>
      ))}
    </div>
  );
}
