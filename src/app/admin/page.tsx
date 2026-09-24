import Link from "next/link";

import { AdminIcon } from "@/components/admin/admin-icon";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { adminSections } from "@/config/admin-sections";
import { isDemoMode } from "@/server/env";
import { guardModule } from "@/server/guard";
import { api } from "@/trpc/server";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const { allowed } = await guardModule("admin");
  if (!allowed) return <Forbidden area="O Admin" />;
  const sections = adminSections.filter((s) => !s.demoOnly || isDemoMode());
  const { counts } = await api.admin.overview();
  return (
    <>
      <PageHeader
        title="Admin"
        description="Configurações da plataforma. Na Fase 0, tudo fica em memória e volta ao início ao restaurar os dados."
      />
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.id} className="border-b border-rule">
            <Link
              href={`/admin/${s.id}`}
              className="flex items-start gap-3 rounded-sm py-4 hover:bg-tint/60 focus-visible:outline-2 focus-visible:outline-ink"
            >
              <AdminIcon name={s.icon} className="mt-0.5 size-5 shrink-0" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{s.title}</span>
                <span className="text-meta text-ink-soft">{s.description}</span>
                {counts[s.id] ? <span className="text-meta font-semibold text-ink">{counts[s.id]}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
