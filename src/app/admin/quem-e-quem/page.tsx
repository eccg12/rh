import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("quem-e-quem").title };

export default async function AdminQuemEQuemPage() {
  return (
    <AdminPage section="quem-e-quem">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
