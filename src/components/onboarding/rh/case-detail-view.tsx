"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { TimelineList } from "@/components/common/timeline-list";
import { personaSwitchUrl, useDemoMode } from "@/components/shell/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDays, formatUntil } from "@/lib/dates";
import { api } from "@/trpc/react";

import { CaseContractTab } from "./case-contract-tab";
import { CaseDocumentsTab } from "./case-documents-tab";
import { CaseEquipmentTab } from "./case-equipment-tab";
import { CaseEvidenceTab } from "./case-evidence-tab";
import { CaseFormTab } from "./case-form-tab";
import { CaseJourneyTab } from "./case-journey-tab";

const TABS = [
  { id: "jornada", label: "Jornada" },
  { id: "ficha", label: "Ficha" },
  { id: "documentos", label: "Documentos" },
  { id: "contrato", label: "Contrato" },
  { id: "equipamentos", label: "Equipamentos e acessos" },
  { id: "linha-do-tempo", label: "Linha do tempo" },
  { id: "evidencias", label: "Evidências" },
] as const;

export function CaseDetailView({ caseId }: { caseId: string }) {
  const [data] = api.onboarding.caseDetail.useSuspenseQuery({ caseId });
  const demo = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("aba")) ? params.get("aba")! : "jornada";
  const setTab = (next: string) => {
    const q = new URLSearchParams(params.toString());
    q.set("aba", next);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };
  const c = data.case;
  const p = data.person;
  const pendingRh = data.stages.flatMap((s) => s.tasks).filter((t) => t.owner !== "new_joiner" && t.actionable).length;

  const facts: [string, React.ReactNode][] = [
    ["Regime", <span key="r" className="inline-flex items-center gap-2">{c.regime}{c.workflowBadge ? <Badge variant="outline">{c.workflowBadge}</Badge> : null}</span>],
    ["Cargo", p.jobTitle ?? "—"],
    ["Início", `${formatDate(c.startDate)} (${formatUntil(c.startDate, data.now)})`],
    ["Gestor", p.managerName ?? "—"],
    ["Projeto inicial", p.projectName ? `${p.projectClient} — ${p.projectName}` : "Sem projeto definido"],
    ["E-mail pessoal", p.personalEmail],
  ];

  return (
    <>
      <Link href="/onboarding" className="mb-3 inline-flex items-center gap-1 rounded-sm text-meta font-medium text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink">
        <ChevronLeft aria-hidden className="size-4" />
        Onboarding
      </Link>
      <header className="mb-6 grid grid-cols-1 gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-page font-semibold">{p.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="case" status={c.status} />
              {pendingRh > 0 ? <StatusBadge kind="task" status="depende_de_voce" label={`${pendingRh} ${pendingRh === 1 ? "pendência" : "pendências"} com você`} /> : null}
              {c.leadTimeDays !== null ? <span className="text-meta text-ink-soft">Lead time de {formatDays(c.leadTimeDays)}</span> : null}
            </div>
          </div>
          {demo ? (
            <Button asChild variant="outline">
              <a href={personaSwitchUrl(p.id, "/onboarding")}>
                <Eye aria-hidden />
                Ver como esta pessoa
              </a>
            </Button>
          ) : null}
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-meta text-ink-soft">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <Progress value={data.progress.percent} className="max-w-72" aria-label="Progresso do onboarding" />
          <span className="tabular-nums">
            {data.progress.percent}% ({data.progress.done} de {data.progress.total} tarefas)
          </span>
          {data.currentStage ? <span className="text-ink-soft">Etapa atual: {data.currentStage.title}</span> : null}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Seções do caso">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="jornada">
          <CaseJourneyTab data={data} onOpenTab={setTab} />
        </TabsContent>
        <TabsContent value="ficha">
          <CaseFormTab data={data} />
        </TabsContent>
        <TabsContent value="documentos">
          <CaseDocumentsTab data={data} />
        </TabsContent>
        <TabsContent value="contrato">
          <CaseContractTab data={data} />
        </TabsContent>
        <TabsContent value="equipamentos">
          <CaseEquipmentTab data={data} />
        </TabsContent>
        <TabsContent value="linha-do-tempo">
          <TimelineList entries={data.timeline} className="max-w-[860px]" />
        </TabsContent>
        <TabsContent value="evidencias">
          <CaseEvidenceTab data={data} />
        </TabsContent>
      </Tabs>
    </>
  );
}
