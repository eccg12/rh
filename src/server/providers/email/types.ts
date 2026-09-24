/** Envio de e-mail (D-OB-03). Fase 0: caixa de saída simulada. Fase 1: Gmail API. */
export interface EmailMessage {
  to: string;
  toName: string;
  toPersonId?: string;
  cc?: string[];
  subject: string;
  html: string;
  templateId: string;
  caseId?: string;
  ruleId?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}
