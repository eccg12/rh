import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { EquipmentRhView } from "@/components/modules/equipment/equipment-rh-view";
import { MyEquipmentView } from "@/components/modules/equipment/my-equipment-view";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { guardModule } from "@/server/guard";
import { api, HydrateClient } from "@/trpc/server";

export const metadata = { title: "Equipamentos e acessos" };

export default async function EquipmentPage() {
  const { session, allowed } = await guardModule("equipamentos");
  if (!allowed) return <Forbidden area="Equipamentos e acessos" />;
  const isRh = session.viewRole === "ADMIN_RH";
  if (isRh) void api.equipment.inventory.prefetch();
  else void api.equipment.mine.prefetch();
  return (
    <HydrateClient>
      <PageHeader
        title="Equipamentos e acessos"
        description={
          isRh
            ? "Inventário, atribuição de equipamentos e acessos pendentes."
            : "Seus equipamentos, o termo de responsabilidade, o e-mail corporativo e seus acessos."
        }
      />
      <Suspense fallback={<PageSkeleton rows={6} />}>{isRh ? <EquipmentRhView /> : <MyEquipmentView />}</Suspense>
    </HydrateClient>
  );
}
