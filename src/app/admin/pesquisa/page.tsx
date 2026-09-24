import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("pesquisa").title };

export default async function AdminPesquisaPage() {
  return (
    <AdminPage section="pesquisa">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
