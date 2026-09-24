import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("automacoes").title };

export default async function AdminAutomacoesPage() {
  return (
    <AdminPage section="automacoes">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
