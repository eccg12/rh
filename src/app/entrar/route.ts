import { NextResponse, type NextRequest } from "next/server";

import { canAccessPath, homePathFor } from "@/config/modules";
import { isDemoMode } from "@/server/env";
import { PERSONA_COOKIE, sessionFor } from "@/server/session";

/**
 * Troca de persona no modo demo (seção 5, D-OB-17): /entrar?persona=<id>&next=<rota>.
 * Grava o cookie `demo_persona` e redireciona. Com DEMO_MODE=false, responde 404.
 */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const personaId = request.nextUrl.searchParams.get("persona") ?? "";
  const session = await sessionFor(personaId);
  if (!session) {
    return new NextResponse("Persona desconhecida", { status: 404 });
  }

  const rawNext = request.nextUrl.searchParams.get("next") ?? "/";
  // Só caminhos internos (evita redirecionamento aberto).
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const nextPath = safeNext.split("?")[0] ?? "/";
  const target = canAccessPath(session.viewRole, nextPath) ? safeNext : homePathFor(session.viewRole);

  const response = NextResponse.redirect(new URL(target, request.url), { status: 303 });
  response.cookies.set(PERSONA_COOKIE, session.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
