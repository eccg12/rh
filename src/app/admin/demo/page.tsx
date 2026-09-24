import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("demo").title };

export default async function AdminDemoPage() {
  return (
    <AdminPage section="demo">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
