import { AdminPage } from "@/components/admin/admin-page";
import { ShellNotice } from "@/components/common/shell-notice";
import { adminSection } from "@/config/admin-sections";

export const metadata = { title: adminSection("fluxos").title };

export default async function AdminFluxosPage() {
  return (
    <AdminPage section="fluxos">
      <ShellNotice title="Área em preparação" />
    </AdminPage>
  );
}
