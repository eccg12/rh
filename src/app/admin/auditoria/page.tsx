import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("auditoria").title };

export default async function AdminAuditoriaPage() {
  return (
    <AdminPage section="auditoria">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
