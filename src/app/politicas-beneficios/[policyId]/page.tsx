import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Política" };

export default async function PolicyPage(props: PageProps<"/politicas-beneficios/[policyId]">) {
  const { policyId } = await props.params;
  const { allowed } = await guardModule("politicas");
  if (!allowed) return <Forbidden area="Políticas e benefícios" />;
  return (
    <>
      <PageHeader title="Política" description={policyId} />
      <ShellNotice title="Texto da política, aceite e histórico de versões" />
    </>
  );
}
