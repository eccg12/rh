/** Assinatura eletrônica (D-OB-03, D-OB-10). Fornecedor real a escolher (seção 17, item 4). */
export interface SignatureProvider {
  readonly name: string;
  sendForSignature(input: {
    contractId: string;
    documentName: string;
    signerName: string;
    signerEmail: string;
  }): Promise<{ envelopeId: string }>;
  sign(input: { envelopeId: string; signerName: string }): Promise<{ verificationCode: string }>;
}
