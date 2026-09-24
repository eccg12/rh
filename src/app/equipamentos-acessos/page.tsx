import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Equipamentos e acessos" };

export default async function EquipmentPage() {
  const { session, allowed } = await guardModule("equipamentos");
  if (!allowed) return <Forbidden area="Equipamentos e acessos" />;
  return (
    <>
      <PageHeader
        title="Equipamentos e acessos"
        description={session.viewRole === "ADMIN_RH" ? "Inventário, atribuição e acessos pendentes." : "Seus equipamentos, o termo de responsabilidade e seus acessos."}
      />
      <ShellNotice title={session.viewRole === "ADMIN_RH" ? "Inventário" : "Meus equipamentos"} />
    </>
  );
}
