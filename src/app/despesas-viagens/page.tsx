import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { ExpensesView } from "@/components/modules/expenses/expenses-view";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { company } from "@/config/company";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Despesas e viagens" };

export default async function ExpensesPage() {
  const { allowed } = await guardModule("despesas");
  if (!allowed) return <Forbidden area="Despesas e viagens" />;
  void api.expenses.overview.prefetch();
  return (
    <HydrateClient>
      <PageHeader
        title="Despesas e viagens"
        description={`Como lançar despesas no ${company.expenseTool.name}, a Política de Viagens e as perguntas frequentes.`}
      />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <ExpensesView />
      </Suspense>
    </HydrateClient>
  );
}
