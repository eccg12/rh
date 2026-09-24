"use client";

import Link from "next/link";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { SectionHeader } from "@/components/shell/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViewRole } from "@/domain/schemas";
import { useUrlTab } from "@/hooks/use-url-tab";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

import { AckBadge } from "../policies/ack-status";
import { TeamWeekPanel } from "./team-week";
import { TimesheetPanel } from "./timesheet-grid";

function RoutineContent() {
  const [data] = api.routine.overview.useSuspenseQuery();
  return (
    <div className="flex max-w-[720px] flex-col gap-10">
      {data.policy ? (
        <section aria-labelledby="rotina" className="flex flex-col gap-3">
          <SectionHeader
            id="rotina"
            title={data.policy.title}
            description={`Versão ${data.policy.version}, vigente desde ${formatDate(data.policy.effectiveFrom)}.`}
            actions={<AckBadge my={data.policy.my} />}
          />
          <p className="text-read">{data.policy.summary}</p>
          {data.policy.isExample ? <ExampleContentNotice /> : null}
          <Link href={`/politicas-beneficios/${data.policy.id}`} className="w-fit underline underline-offset-4">
            {data.policy.my.canAcknowledge ? "Ler e aceitar a política" : "Ler a política completa"}
          </Link>
        </section>
      ) : null}
      {data.rituals ? (
        <section aria-labelledby="rituais" className="flex flex-col gap-3">
          <SectionHeader id="rituais" title="Rituais da equipe" />
          {data.rituals.isExample ? <ExampleContentNotice /> : null}
          <Markdown>{data.rituals.bodyMd}</Markdown>
        </section>
      ) : null}
    </div>
  );
}

export function RoutineView({ viewRole, isManager }: { viewRole: ViewRole; isManager: boolean }) {
  const logsHours = viewRole !== "NEW_JOINER";
  const ids = [
    ...(viewRole === "ADMIN_RH" && isManager ? (["equipe"] as const) : []),
    ...(logsHours ? (["apontamento"] as const) : []),
    ...(viewRole !== "ADMIN_RH" && isManager ? (["equipe"] as const) : []),
    "rotina" as const,
  ];
  const [tab, setTab] = useUrlTab<string>(ids, ids[0]!);

  if (!logsHours) {
    return (
      <div className="flex flex-col gap-6">
        <p className="max-w-[72ch] rounded-lg border border-rule bg-surface px-4 py-3">
          O apontamento semanal de horas começa depois do seu onboarding. Por enquanto, conheça a rotina e os rituais da equipe.
        </p>
        <RoutineContent />
      </div>
    );
  }

  const labels: Record<string, string> = { apontamento: "Meu apontamento", equipe: "Horas da equipe", rotina: "Rotina de trabalho" };
  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <TabsList aria-label="Seções de rotina e apontamento">
        {ids.map((id) => (
          <TabsTrigger key={id} value={id}>
            {labels[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      {ids.includes("apontamento") ? (
        <TabsContent value="apontamento">
          <TimesheetPanel />
        </TabsContent>
      ) : null}
      {ids.includes("equipe") ? (
        <TabsContent value="equipe">
          <TeamWeekPanel />
        </TabsContent>
      ) : null}
      <TabsContent value="rotina">
        <RoutineContent />
      </TabsContent>
    </Tabs>
  );
}
