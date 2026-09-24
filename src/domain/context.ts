/**
 * Contexto dos serviços de domínio: repositório, relógio e provedores (D-OB-03).
 * O app usa um contexto único (src/server/domain.ts); testes e seed montam o seu.
 */
import type { DataRepository } from "@/server/data/repository";
import type { EmailProvider } from "@/server/providers/email/types";
import type { SignatureProvider } from "@/server/providers/signature/types";
import type { StorageProvider } from "@/server/providers/storage/types";

import type { Clock } from "./clock";

export interface DomainContext {
  repo: DataRepository;
  clock: Clock;
  email: EmailProvider;
  signature: SignatureProvider;
  storage: StorageProvider;
  /** URL base dos links nos e-mails. */
  appUrl: string;
  /** No modo demo, links de e-mail trocam a persona (/entrar). */
  demoMode: boolean;
}

/** Erro de regra de negócio, com mensagem pronta para a interface. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID" = "INVALID",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
