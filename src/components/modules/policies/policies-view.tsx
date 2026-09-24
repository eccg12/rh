"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AckState } from "@/domain/services/policy-queries";
import { useUrlTab } from "@/hooks/use-url-tab";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api, type RouterOutputs } from "@/trpc/react";

import { AckBadge, AckSentence } from "./ack-status";

type Overview = RouterOutputs["policies"]["overview"];

const BENEFIT_KIND: Record<string, string> = { saude: "Plano de saúde", odonto: "Plano odontológico", outros: "Benefício" };

function PolicyList({ policies }: { policies: Overview["policies"] }) {
  const pending = policies.filter((p) => p.my.canAcknowledge);
  return (
    <section aria-labelledby="politicas-vigentes" className="flex max-w-[860px] flex-col gap-4">
      <SectionHeader id="politicas-vigentes" title="Políticas vigentes" description="A versão em vigor de cada política e o status do seu aceite." />
      {pending.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-surface p-4">
          <StatusBadge kind="task" status="depende_de_voce" />
          <p>
            {pending.length === 1
              ? `A ${pending[0]!.title} espera o seu aceite.`
              : `${plural(pending.length, "política espera", "políticas esperam")} o seu aceite.`}
          </p>
        </div>
      ) : null}
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {policies.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={`/politicas-beneficios/${p.id}`}
                className="w-fit font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {p.title}
              </Link>
              <p className="text-meta text-ink-soft">
                {p.categoryLabel}. Versão {p.version}, vigente desde {formatDate(p.effectiveFrom)}.
              </p>
              <p className="text-ink-soft">{p.summary}</p>
              {p.my.state === "reaceite" || p.my.state === "na_jornada" ? (
                <p className="text-meta">
                  <AckSentence my={p.my} version={p.version} />
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
              <AckBadge my={p.my} />
              {p.my.state === "aceita" && p.my.acknowledgedAt ? (
                <span className="text-meta text-ink-soft">em {formatDate(p.my.acknowledgedAt)}</span>
              ) : null}
              {p.my.canAcknowledge ? (
                <Button asChild size="sm">
                  <Link href={`/politicas-beneficios/${p.id}`}>Ler e aceitar</Link>
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {policies.some((p) => p.isExample) ? <ExampleContentNotice /> : null}
    </section>
  );
}

function BenefitList({ benefits }: { benefits: Overview["benefits"] }) {
  return (
    <section aria-labelledby="beneficios-ativos" className="flex max-w-[860px] flex-col gap-4">
      <SectionHeader id="beneficios-ativos" title="Benefícios ativos" description="O provedor de cada benefício, quem é elegível e como usar." />
      {benefits.length === 0 ? <p className="text-ink-soft">Nenhum benefício ativo no momento.</p> : null}
      {benefits.map((b) => (
        <Card key={b.category} className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-section font-semibold">{b.active.providerName}</h3>
              <p className="text-meta text-ink-soft">
                {BENEFIT_KIND[b.category]}, vigente desde {formatDate(b.active.validFrom)}. Elegível para{" "}
                {b.active.eligibleRegimes.join(" e ")}.
              </p>
            </div>
            {b.eligibleForMe === true ? <StatusBadge kind="access" status="liberado" label="Você é elegível" /> : null}
            {b.eligibleForMe === false ? <StatusBadge kind="task" status="dispensada" label="Não se aplica ao seu regime" /> : null}
          </div>
          {b.active.isExample ? <ExampleContentNotice /> : null}
          <Markdown variant="chat">{b.active.summaryMd}</Markdown>
          <h4 className="font-semibold">Como usar</h4>
          <Markdown variant="chat">{b.active.howToUseMd}</Markdown>
          {b.active.videoUrl ? (
            <a
              href={b.active.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 underline underline-offset-4"
            >
              <PlayCircle aria-hidden className="size-4" strokeWidth={1.75} />
              Vídeo explicativo
            </a>
          ) : null}
          {b.previous.length > 0 ? (
            <p className="border-t border-rule pt-3 text-meta text-ink-soft">
              Antes:{" "}
              {b.previous
                .map((p) => `${p.providerName}, de ${formatDate(p.validFrom)}${p.validUntil ? ` a ${formatDate(p.validUntil)}` : ""}`)
                .join("; ")}
              .
            </p>
          ) : null}
        </Card>
      ))}
    </section>
  );
}

const MATRIX_LABEL: Record<AckState, string> = {
  aceita: "Aceita",
  pendente: "Pendente",
  reaceite: "Nova versão",
  na_jornada: "Na jornada",
  nao_exige: "Leitura",
};

function AckMatrixView({ matrix }: { matrix: NonNullable<Overview["matrix"]> }) {
  return (
    <section aria-labelledby="matriz" className="flex flex-col gap-4">
      <SectionHeader
        id="matriz"
        title="Matriz de aceites"
        description="Quem aceitou a versão vigente de cada política. Quem está no onboarding aceita na própria jornada."
      />
      <p>
        {matrix.pendingTotal === 0
          ? "Todos os aceites estão em dia."
          : `${plural(matrix.pendingTotal, "aceite pendente", "aceites pendentes")}. Pessoas com pendência aparecem primeiro.`}
      </p>
      <div className="rounded-lg border border-rule bg-surface">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[200px]">
                Pessoa
              </TableHead>
              {matrix.policies.map((p) => (
                <TableHead key={p.id} scope="col" className="align-bottom">
                  <span className="flex flex-col gap-0.5 py-1 whitespace-normal">
                    <Link href={`/politicas-beneficios/${p.id}`} className="underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                    <span className="font-normal text-ink-soft">
                      Versão {p.version}
                      {p.pending > 0 ? `, ${plural(p.pending, "pendente", "pendentes")}` : ""}
                    </span>
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.map((row) => (
              <TableRow key={row.person.id}>
                <TableHead scope="row" className="py-3 align-top font-normal whitespace-normal">
                  <span className="flex flex-col">
                    <span className="font-medium text-ink">{row.person.name}</span>
                    {row.person.detail ? <span className="text-meta text-ink-soft">{row.person.detail}</span> : null}
                  </span>
                </TableHead>
                {matrix.policies.map((p) => {
                  const cell = row.cells[p.id];
                  if (!cell) return <TableCell key={p.id} />;
                  return (
                    <TableCell key={p.id} className="py-3 align-top">
                      <span className="flex flex-col items-start gap-1">
                        <StatusBadge kind="ack" status={cell.state} label={MATRIX_LABEL[cell.state]} />
                        {cell.state === "aceita" && cell.acknowledgedAt ? (
                          <span className="text-meta text-ink-soft">em {formatDate(cell.acknowledgedAt)}</span>
                        ) : null}
                        {cell.state === "reaceite" ? (
                          <span className="text-meta text-ink-soft">aceitou a versão {cell.ackedVersion}</span>
                        ) : null}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function PoliciesView({ isRh }: { isRh: boolean }) {
  const [data] = api.policies.overview.useSuspenseQuery();
  const ids = isRh ? (["aceites", "politicas", "beneficios"] as const) : (["politicas", "beneficios"] as const);
  const [tab, setTab] = useUrlTab<string>(ids, ids[0]);
  const pending = data.policies.filter((p) => p.my.canAcknowledge).length;

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <TabsList aria-label="Seções de políticas e benefícios">
        {isRh && data.matrix ? (
          <TabsTrigger value="aceites">
            Matriz de aceites{data.matrix.pendingTotal > 0 ? ` (${data.matrix.pendingTotal})` : ""}
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="politicas">Políticas{pending > 0 ? ` (${pending})` : ""}</TabsTrigger>
        <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
      </TabsList>
      {isRh && data.matrix ? (
        <TabsContent value="aceites">
          <AckMatrixView matrix={data.matrix} />
        </TabsContent>
      ) : null}
      <TabsContent value="politicas">
        <PolicyList policies={data.policies} />
      </TabsContent>
      <TabsContent value="beneficios" id="beneficios">
        <BenefitList benefits={data.benefits} />
      </TabsContent>
    </Tabs>
  );
}
