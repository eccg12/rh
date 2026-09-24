import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Cadastrar new joiner" };

export default async function NewCasePage() {
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "ADMIN_RH") return <Forbidden area="O cadastro de new joiners" />;
  return (
    <>
      <PageHeader title="Cadastrar new joiner" description="Pessoa, vínculo e preparação, com revisão ao final." />
      <ShellNotice title="Formulário de cadastro" />
    </>
  );
}
