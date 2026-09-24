import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { adminSection, type AdminSectionId } from "@/config/admin-sections";
import { guardModule } from "@/server/guard";

/** Moldura das páginas do Admin: guarda de acesso (só RH), voltar e título. */
export async function AdminPage({
  section,
  actions,
  children,
}: {
  section: AdminSectionId;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { allowed } = await guardModule("admin");
  if (!allowed) return <Forbidden area="O Admin" />;
  const s = adminSection(section);
  return (
    <>
      <Link
        href="/admin"
        className="mb-3 inline-flex items-center gap-1 rounded-sm text-meta font-medium text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Admin
      </Link>
      <PageHeader title={s.title} description={s.description} actions={actions} />
      {children}
    </>
  );
}
