import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Políticas e benefícios" };

export default async function PoliciesPage() {
  const { allowed } = await guardModule("politicas");
  if (!allowed) return <Forbidden area="Políticas e benefícios" />;
  return (
    <>
      <PageHeader title="Políticas e benefícios" description="As políticas vigentes, o seu aceite e os benefícios ativos." />
      <ShellNotice title="Políticas vigentes e benefícios" />
    </>
  );
}
