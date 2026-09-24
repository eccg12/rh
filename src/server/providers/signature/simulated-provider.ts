import type { SignatureProvider } from "./types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function code(parts: number, size: number): string {
  const chunks: string[] = [];
  for (let p = 0; p < parts; p++) {
    let chunk = "";
    for (let i = 0; i < size; i++) chunk += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    chunks.push(chunk);
  }
  return chunks.join("-");
}

/** Assinatura simulada: gera envelope e código de verificação fictícios. */
export class SimulatedSignatureProvider implements SignatureProvider {
  readonly name = "Assinatura simulada";

  async sendForSignature(): Promise<{ envelopeId: string }> {
    return { envelopeId: `ENV-${code(2, 4)}` };
  }

  async sign(): Promise<{ verificationCode: string }> {
    return { verificationCode: `MON-${code(3, 4)}` };
  }
}
