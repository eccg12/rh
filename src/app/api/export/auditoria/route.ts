import { NextResponse, type NextRequest } from "next/server";

import { auditLog, auditToCsv, type AuditOrigin } from "@/domain/services/admin-queries";
import { getDomain } from "@/server/domain";
import { personaFromCookieHeader, resolveSession } from "@/server/session";

const ORIGINS: AuditOrigin[] = ["manual", "automatico", "sistema"];

/** CSV da auditoria com os mesmos filtros da tela (seção 9.10). Datas no fuso de São Paulo. Só RH. */
export async function GET(request: NextRequest) {
  const domain = await getDomain();
  const session = await resolveSession(domain, personaFromCookieHeader(request.headers.get("cookie")));
  if (session.viewRole !== "ADMIN_RH") return new NextResponse("Disponível só para o RH.", { status: 403 });
  const q = request.nextUrl.searchParams;
  const origin = q.get("origin");
  const { rows } = await auditLog(domain, {
    personId: q.get("personId") ?? undefined,
    type: q.get("type") ?? undefined,
    origin: origin && (ORIGINS as string[]).includes(origin) ? (origin as AuditOrigin) : undefined,
  });
  const date = domain.clock.todayKey();
  return new NextResponse(auditToCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="auditoria-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
