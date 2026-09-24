import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("junta classes e resolve conflitos do Tailwind", () => {
    expect(cn("px-2", "px-4", false && "hidden", "text-ink")).toBe("px-4 text-ink");
  });
});
