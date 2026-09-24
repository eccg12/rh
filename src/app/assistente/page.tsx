import { AssistantPageView } from "@/components/assistant/assistant-page-view";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Assistente" };

export default async function AssistantPage(props: PageProps<"/assistente">) {
  const { allowed } = await guardModule("assistente");
  if (!allowed) return <Forbidden area="O assistente" />;
  const { q } = await props.searchParams;
  const initialQuestion = typeof q === "string" && q.trim() ? q.trim().slice(0, 1000) : undefined;
  void api.assistant.overview.prefetch();

  return (
    <HydrateClient>
      <PageHeader
        title="Assistente"
        description="Tire dúvidas sobre onboarding, despesas e viagens, benefícios, equipamentos, acessos, rotina e compliance."
      />
      <AssistantPageView initialQuestion={initialQuestion} />
    </HydrateClient>
  );
}
