import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("caixa-de-saida").title };

export default async function AdminCaixaDeSaidaPage() {
  return (
    <AdminPage section="caixa-de-saida">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
