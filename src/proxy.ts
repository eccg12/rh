import { NextResponse, type NextRequest } from "next/server";

/**
 * Senha opcional da demo (D-OB-18). Com DEMO_PASSWORD definida, todas as páginas pedem Basic Auth
 * (qualquer usuário, a senha definida). Sem a variável, nada muda. O proxy roda no runtime Node.js,
 * então a variável é lida em tempo de execução, nunca congelada no build.
 */
const REALM = 'Basic realm="Monoda People", charset="UTF-8"';

function sameText(a: string, b: string): boolean {
  // Comparação em tempo constante para não vazar o tamanho do acerto.
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD?.trim();
  if (!password) return NextResponse.next();
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (sameText(given, password)) return NextResponse.next();
  }
  return new NextResponse("Acesso restrito à demonstração da Monoda People.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  // Arquivos estáticos do build e a marca não precisam de senha.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|brand/).*)"],
};
