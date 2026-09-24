import Link from "next/link";
import { UserPlus } from "lucide-react";

import { ShellNotice } from "@/components/common/shell-notice";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { guardModule } from "@/server/guard";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { session, allowed } = await guardModule("onboarding");
  if (!allowed) return <Forbidden area="O onboarding" />;

  if (session.viewRole === "ADMIN_RH") {
    return (
      <>
        <PageHeader
          title="Onboarding"
          actions={
            <Button asChild>
              <Link href="/onboarding/novo">
                <UserPlus aria-hidden />
                Cadastrar new joiner
              </Link>
            </Button>
          }
        />
        <ShellNotice title="Central de onboarding" description="Fluxo por etapa, pendências do RH, automações e a lista de new joiners." />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Oi, ${session.firstName}.`} description="Sua jornada até o primeiro dia, etapa por etapa." />
      <ShellNotice title="Minha jornada" description="A linha da jornada e o próximo passo aparecem aqui." />
    </>
  );
}
