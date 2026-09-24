"use client";

import Link from "next/link";
import { ChevronRight, Inbox, UserPlus, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { AutomatedTag } from "@/components/common/automated-tag";
import { EmptyState } from "@/components/common/empty-state";
import { FlowStrip } from "@/components/common/flow-strip";
import { StatusBadge } from "@/components/common/status-badge";
import { PageHeader, SectionHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAgo, formatDate, formatDays, formatTime, formatUntil } from "@/lib/dates";
import { firstName, formatInt } from "@/lib/format";
import { api } from "@/trpc/react";

/** Aba do caso que resolve cada pendência do RH. */
const TASK_TAB: Record<string, string> = {
  "revisao-documentos": "documentos",
  "contrato-preparar": "contrato",
  "email-corporativo": "equipamentos",
  "notebook-atribuir": "equipamentos",
  acessos: "equipamentos",
  "exame-agendar": "jornada",
  "envio-contabilidade": "jornada",
};

export function RhCentral() {
  const [data] = api.onboarding.overview.useSuspenseQuery();
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [regime, setRegime] = useState<"todos" | "PJ" | "CLT">("todos");
  const [onlyRh, setOnlyRh] = useState(false);

  const rows = useMemo(
    () =>
      data.cases.filter(
        (c) =>
          (!stageFilter || (c.status === "em_andamento" && c.currentStageId === stageFilter)) &&
          (regime === "todos" || c.regime === regime) &&
          (!onlyRh || c.hasRhPending),
      ),
    [data.cases, stageFilter, regime, onlyRh],
  );
  const stageTitle = data.stages.find((s) => s.id === stageFilter)?.title;

  return (
    <>
      <PageHeader
        title="Onboarding"
        actions={
          <Button asChild>
            <Link href="/onboarding/novo">
              <UserPlus aria-hidden />
              Cadastrar new joiner
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="fluxo" className="mb-10">
        <SectionHeader
          id="fluxo"
          title="Fluxo do onboarding"
          description="Tempo médio em cada etapa, da liberação da primeira tarefa à conclusão. Clique numa etapa para filtrar a tabela."
          actions={
            <p className="text-ui tabular-nums">
              Lead time médio:{" "}
              <strong className="font-semibold">{data.leadTimeDays === null ? "sem casos concluídos" : formatDays(data.leadTimeDays)}</strong>
              {data.completedCount ? <span className="text-ink-soft"> ({data.completedCount} concluídos)</span> : null}
            </p>
          }
        />
        <FlowStrip stages={data.stages} selectedId={stageFilter} onSelect={setStageFilter} />
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="pendencias">
          <SectionHeader id="pendencias" title={`Depende de você (${data.pending.length})`} description="Só o que precisa de decisão humana, do mais antigo para o mais novo." />
          {data.pending.length === 0 ? (
            <EmptyState compact title="Nenhuma pendência com você." description="As próximas aparecem aqui assim que alguém avançar." />
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {data.pending.map((p) => (
                <li key={`${p.caseId}-${p.taskDefId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{p.personName}</span>
                    <span className="text-ink-soft">
                      {p.taskTitle}
                      {p.detail ? `, ${p.detail.charAt(0).toLowerCase()}${p.detail.slice(1)}` : ""}
                    </span>
                  </div>
                  <span className="text-meta text-ink-soft tabular-nums">{formatAgo(p.availableAt, data.now)}</span>
                  <Button asChild size="sm" variant="signal">
                    <Link href={`/onboarding/casos/${p.caseId}?aba=${TASK_TAB[p.taskDefId] ?? "jornada"}`}>{p.actionLabel}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="automacoes">
          <SectionHeader id="automacoes" title="Automações nos últimos 30 dias" />
          <p className="flex items-baseline gap-2">
            <span className="text-page font-semibold tabular-nums">{formatInt(data.automations.total30d)}</span>
            <span className="text-ink-soft">ações automáticas</span>
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-rule border-y border-rule">
            {data.automations.recent.map((a) => (
              <li key={a.id} className="flex items-start gap-2 py-2.5">
                <Zap aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.75} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-meta leading-snug">{a.title}</span>
                  <span className="text-meta text-ink-soft tabular-nums">
                    {formatAgo(a.at, data.now) === "hoje" ? `hoje, ${formatTime(a.at)}` : `${formatAgo(a.at, data.now)}, ${formatTime(a.at)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="link" className="mt-2 h-auto px-0">
            <Link href="/admin/caixa-de-saida">
              <Inbox aria-hidden />
              Ver a caixa de saída
            </Link>
          </Button>
        </section>
      </div>

      <section aria-labelledby="new-joiners">
        <SectionHeader
          id="new-joiners"
          title="New joiners"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {stageTitle ? (
                <Button variant="outline" size="sm" onClick={() => setStageFilter(null)}>
                  Etapa: {stageTitle}
                  <span aria-hidden>×</span>
                  <span className="sr-only">Remover filtro de etapa</span>
                </Button>
              ) : null}
              <div className="flex items-center gap-2">
                <Label htmlFor="filtro-regime" className="text-ink-soft">
                  Regime
                </Label>
                <Select value={regime} onValueChange={(v) => setRegime(v as typeof regime)}>
                  <SelectTrigger id="filtro-regime" size="sm" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="CLT">CLT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="filtro-rh" checked={onlyRh} onCheckedChange={(v) => setOnlyRh(v === true)} />
                <Label htmlFor="filtro-rh">Com pendência do RH</Label>
              </div>
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState compact title="Nenhum new joiner com esses filtros." description="Limpe os filtros ou cadastre alguém." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Etapa atual</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Próxima ação</TableHead>
                <TableHead>Última atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.caseId} className="hover:bg-tint/50">
                  <TableCell>
                    <Link href={`/onboarding/casos/${c.caseId}`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                      {c.name}
                      <ChevronRight aria-hidden className="size-4 text-ink-soft" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.regime === "CLT" ? "outline" : "secondary"}>{c.regime}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.jobTitle ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap" title={formatDate(c.startDate)}>
                    {c.status === "concluido" ? formatDate(c.startDate) : formatUntil(c.startDate, data.now)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.status === "concluido" ? <StatusBadge kind="case" status="concluido" /> : c.currentStageTitle}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-28 items-center gap-2">
                      <Progress value={c.progress} className="h-1.5" aria-label={`Progresso de ${c.name}`} />
                      <span className="w-9 text-meta tabular-nums">{c.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.nextActionWith === "rh" ? (
                      <StatusBadge kind="task" status="depende_de_voce" label="RH" />
                    ) : c.nextActionWith === "new_joiner" ? (
                      firstName(c.name)
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-soft">{formatAgo(c.lastActivityAt, data.now)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 flex items-center gap-2 text-meta text-ink-soft">
          <AutomatedTag /> Avisos e liberações automáticos aparecem na linha do tempo de cada caso.
        </p>
      </section>
    </>
  );
}
