import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { company } from "@/config/company";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Despesas e viagens" };

export default async function ExpensesPage() {
  const { allowed } = await guardModule("despesas");
  if (!allowed) return <Forbidden area="Despesas e viagens" />;
  return (
    <>
      <PageHeader title="Despesas e viagens" description={`Como lançar despesas no ${company.expenseTool.name}, a política de viagens e as perguntas frequentes.`} />
      <ShellNotice title="Tutorial, política e perguntas frequentes" />
    </>
  );
}
