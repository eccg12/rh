import { redirect } from "next/navigation";

import { homePathFor } from "@/config/modules";
import { getSession } from "@/server/session";

/** `/` redireciona conforme a persona (seção 5). */
export default async function HomePage() {
  const session = await getSession();
  redirect(homePathFor(session.viewRole));
}
