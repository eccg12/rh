import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("compliance").title };

export default async function AdminCompliancePage() {
  return (
    <AdminPage section="compliance">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
