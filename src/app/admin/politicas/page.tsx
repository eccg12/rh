import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("politicas").title };

export default async function AdminPoliticasPage() {
  return (
    <AdminPage section="politicas">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
