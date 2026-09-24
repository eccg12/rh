import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("beneficios").title };

export default async function AdminBeneficiosPage() {
  return (
    <AdminPage section="beneficios">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
