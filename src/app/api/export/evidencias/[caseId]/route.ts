import { NextResponse, type NextRequest } from "next/server";

import { caseEvidences, evidencesToCsv } from "@/domain/services/case-queries";
import { buildCaseView, loadCaseSnapshot } from "@/domain/workflow-engine";
import { getDomain } from "@/server/domain";
import { personaFromCookieHeader, resolveSession } from "@/server/session";

/** CSV de evidências do caso (seção 9.2): datas no fuso de São Paulo. Só RH. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/export/evidencias/[caseId]">) {
  const { caseId } = await ctx.params;
  const domain = await getDomain();
  const session = await resolveSession(domain, personaFromCookieHeader(request.headers.get("cookie")));
  if (session.viewRole !== "ADMIN_RH") return new NextResponse("Disponível só para o RH.", { status: 403 });
  const c = await domain.repo.cases.get(caseId);
  if (!c) return new NextResponse("Caso não encontrado.", { status: 404 });
  const view = buildCaseView(await loadCaseSnapshot(domain, caseId));
  const csv = evidencesToCsv(await caseEvidences(domain, view));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="evidencias-${caseId}.csv"`,
      "cache-control": "no-store",
    },
  });
}
