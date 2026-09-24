import { AdminPage } from "@/components/admin/admin-page";
import { FlowsView } from "@/components/admin/flows-view";
import { adminSection } from "@/config/admin-sections";
import { workflows } from "@/config/workflows";
import { describeWorkflow } from "@/domain/workflow-description";

export const metadata = { title: adminSection("fluxos").title };

export default async function AdminFluxosPage() {
  const flows = workflows.map(describeWorkflow);
  return (
    <AdminPage section="fluxos">
      <p className="mb-6 max-w-[72ch] text-ink-soft">
        Somente leitura. Mudar etapas, tarefas e condições é editar a configuração do fluxo; a edição pela tela fica para a
        Fase 2.
      </p>
      <FlowsView flows={flows} />
    </AdminPage>
  );
}
