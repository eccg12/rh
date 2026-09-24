import { Hammer } from "lucide-react";

import { EmptyState } from "./empty-state";

/** Aviso de área em preparação dentro de uma página já navegável. */
export function ShellNotice({ title, description }: { title: string; description?: string }) {
  return <EmptyState icon={Hammer} title={title} description={description} />;
}
