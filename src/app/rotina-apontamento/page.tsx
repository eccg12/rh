import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Rotina e apontamento" };

export default async function RoutinePage() {
  const { allowed } = await guardModule("rotina");
  if (!allowed) return <Forbidden area="Rotina e apontamento" />;
  return (
    <>
      <PageHeader title="Rotina e apontamento" description="A prioridade agora é o onboarding. O apontamento ganha integração com projetos e com os indicadores do ERP numa fase seguinte." />
      <ShellNotice title="Rotina de trabalho e apontamento semanal" />
    </>
  );
}
