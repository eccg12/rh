import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Caso de onboarding" };

export default async function CasePage(props: PageProps<"/onboarding/casos/[caseId]">) {
  const { caseId } = await props.params;
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "ADMIN_RH") return <Forbidden area="O detalhe do caso" />;
  return (
    <>
      <PageHeader title="Caso de onboarding" description={`Caso ${caseId}`} />
      <ShellNotice title="Jornada, ficha, documentos, contrato, equipamentos, linha do tempo e evidências" />
    </>
  );
}
