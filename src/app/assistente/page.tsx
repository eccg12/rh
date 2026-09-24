import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Assistente" };

export default async function AssistantPage() {
  const { allowed } = await guardModule("assistente");
  if (!allowed) return <Forbidden area="O assistente" />;
  return (
    <>
      <PageHeader title="Assistente" description="Respostas a partir da base de conhecimento. Quando a base não sabe, o assistente diz com quem falar." />
      <div className="max-w-[720px]">
        <AssistantPanel />
      </div>
    </>
  );
}
