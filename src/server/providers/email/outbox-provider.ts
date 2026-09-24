import type { Clock } from "@/domain/clock";
import type { DataRepository } from "@/server/data/repository";

import type { EmailMessage, EmailProvider } from "./types";

/** Grava cada envio na caixa de saída, com status "simulado" (seção 8.6). Nada sai da máquina. */
export class OutboxEmailProvider implements EmailProvider {
  readonly name = "Caixa de saída simulada";

  constructor(
    private readonly repo: DataRepository,
    private readonly clock: Clock,
  ) {}

  async send(message: EmailMessage): Promise<{ id: string }> {
    const id = this.repo.newId("email");
    await this.repo.email.insertOutbox({
      id,
      to: message.to,
      toName: message.toName,
      toPersonId: message.toPersonId,
      cc: message.cc,
      subject: message.subject,
      bodyHtml: message.html,
      templateId: message.templateId,
      caseId: message.caseId,
      ruleId: message.ruleId,
      createdAt: this.clock.nowIso(),
      status: "simulado",
    });
    return { id };
  }
}
