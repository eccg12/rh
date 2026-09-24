import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("base-de-conhecimento").title };

export default async function AdminBaseDeConhecimentoPage() {
  return (
    <AdminPage section="base-de-conhecimento">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
