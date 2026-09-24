"use client";

import type { StageId } from "@/domain/schemas";
import { formatDateTime } from "@/lib/dates";
import { api } from "@/trpc/react";

import { ComplianceStage } from "./compliance-stage";
import { ContractStage } from "./contract-stage";
import { DocumentsSection, ExamSection } from "./documents-section";
import { EquipmentStage } from "./equipment-stage";
import { FeedbackStage } from "./feedback-stage";
import { FichaForm } from "./ficha-form";
import { FirstDayStage } from "./first-day-stage";
import { PoliciesStage } from "./policies-stage";
import { StageFrame } from "./stage-frame";
import { SectionHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/common/status-badge";

export function StageView({ stageId }: { stageId: StageId }) {
  const [data] = api.onboarding.stage.useSuspenseQuery({ stageId });

  return (
    <StageFrame data={data}>
      {data.kind === "cadastro-documentos" ? (
        <div className="grid grid-cols-1 gap-12">
          <section id="ficha" aria-labelledby="ficha-titulo" className="grid min-w-0 grid-cols-1 gap-4 scroll-mt-32">
            <SectionHeader id="ficha-titulo" title="Ficha cadastral" as="h2" description="Uns 10 minutos. Seus dados ficam só com o RH." />
            {data.form.summary ? (
              <div className="grid grid-cols-1 gap-4">
                <p className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="task" status="concluida" label="Ficha enviada" />
                  <span className="text-meta text-ink-soft">{data.form.submittedAt ? formatDateTime(data.form.submittedAt) : ""}</span>
                </p>
                <dl className="divide-y divide-rule border-y border-rule">
                  {data.form.summary
                    .flatMap((s) => s.fields)
                    .filter((f) => !f.items)
                    .slice(0, 12)
                    .map((f) => (
                      <div key={f.path} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[220px_minmax(0,1fr)]">
                        <dt className="text-meta text-ink-soft">{f.label}</dt>
                        <dd className="min-w-0 break-words">{f.display}</dd>
                      </div>
                    ))}
                </dl>
                <p className="text-meta text-ink-soft">Precisa corrigir algo? Fale com o RH.</p>
              </div>
            ) : data.form.values ? (
              <FichaForm
                key={data.form.schema.id}
                schema={data.form.schema}
                initialValues={data.form.values}
                updatedAt={data.form.updatedAt}
                privacyNotice={data.privacyNotice}
              />
            ) : null}
          </section>
          <section id="documentos" aria-labelledby="documentos-titulo" className="grid min-w-0 grid-cols-1 gap-4 scroll-mt-32">
            <SectionHeader id="documentos-titulo" title="Documentos" as="h2" description="PDF, JPG ou PNG de até 10 MB. O RH revisa cada um." />
            <DocumentsSection data={data} />
          </section>
          {data.exam ? <ExamSection data={data} /> : null}
        </div>
      ) : data.kind === "contrato" ? (
        <ContractStage data={data} />
      ) : data.kind === "compliance" ? (
        <ComplianceStage data={data} />
      ) : data.kind === "politicas-beneficios" ? (
        <PoliciesStage data={data} />
      ) : data.kind === "equipamentos-acessos" ? (
        <EquipmentStage data={data} />
      ) : data.kind === "primeiro-dia" ? (
        <FirstDayStage data={data} />
      ) : data.kind === "feedback" ? (
        <FeedbackStage data={data} />
      ) : (
        <p className="text-ink-soft">
          {data.createdBy} cadastrou você em {formatDateTime(data.createdAt)}. Nada a fazer aqui: é a partir daqui que a sua jornada começa.
        </p>
      )}
    </StageFrame>
  );
}
