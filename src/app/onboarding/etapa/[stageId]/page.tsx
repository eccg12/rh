import { notFound } from "next/navigation";

import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { STAGE_TITLES } from "@/config/workflows";
import { StageIdSchema } from "@/domain/schemas";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Etapa do onboarding" };

export default async function StagePage(props: PageProps<"/onboarding/etapa/[stageId]">) {
  const { stageId } = await props.params;
  const parsed = StageIdSchema.safeParse(stageId);
  if (!parsed.success) notFound();
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed || session.viewRole !== "NEW_JOINER") return <Forbidden area="Esta etapa" />;
  return (
    <>
      <PageHeader title={STAGE_TITLES[parsed.data]} />
      <ShellNotice title="Tarefas da etapa" />
    </>
  );
}
