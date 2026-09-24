import type { DomainContext } from "./context";
import type { AuditEvent } from "./schemas";

/** Registro direto na auditoria (para o que não é evento de domínio: e-mail, acesso a dado sensível…). */
export async function recordAudit(
  ctx: DomainContext,
  entry: Omit<AuditEvent, "id" | "at"> & { at?: string },
): Promise<AuditEvent> {
  return ctx.repo.audit.insert({
    ...entry,
    id: ctx.repo.newId("evt"),
    at: entry.at ?? ctx.clock.nowIso(),
  });
}
