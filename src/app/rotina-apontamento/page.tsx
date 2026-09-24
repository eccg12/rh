import { FlaskConical } from "lucide-react";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { RoutineView } from "@/components/modules/routine/routine-view";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Rotina e apontamento" };

export default async function RoutinePage() {
  const { session, allowed } = await guardModule("rotina");
  if (!allowed) return <Forbidden area="Rotina e apontamento" />;
  void api.routine.overview.prefetch();
  if (session.viewRole !== "NEW_JOINER") void api.routine.week.prefetch({});
  if (session.isManager) void api.routine.team.prefetch({});
  return (
    <HydrateClient>
      <PageHeader
        title="Rotina e apontamento"
        description={
          session.viewRole === "NEW_JOINER"
            ? "Como é a semana na Monoda e os rituais da equipe."
            : "Apontamento semanal de horas por projeto, a rotina de trabalho e os rituais da equipe."
        }
      >
        <p className="flex max-w-[72ch] items-start gap-2 rounded-lg border border-dashed border-control bg-surface px-4 py-3 text-ink-soft">
          <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.75} />
          <span>
            <span className="font-semibold text-ink">Beta. </span>A prioridade agora é o onboarding. O apontamento ganha
            integração com projetos e com os indicadores do ERP numa fase seguinte.
          </span>
        </p>
      </PageHeader>
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <RoutineView viewRole={session.viewRole} isManager={session.isManager} />
      </Suspense>
    </HydrateClient>
  );
}
