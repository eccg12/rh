import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("junta classes e resolve conflitos do Tailwind", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-ink")).toBe("px-4 text-ink");
  });

  it("não confunde a escala tipográfica própria com cor", () => {
    // Regressão: o botão pequeno perdia a cor do texto (text-meta tratado como cor).
    expect(cn("text-primary-foreground", "text-meta")).toBe("text-primary-foreground text-meta");
    expect(cn("text-meta font-medium", "text-ok")).toBe("text-meta font-medium text-ok");
    // Conflito real de tamanho continua resolvido.
    expect(cn("text-meta", "text-ui")).toBe("text-ui");
  });
});
