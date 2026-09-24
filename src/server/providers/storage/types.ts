/** Armazenamento de arquivos (D-OB-03). Fase 0: só metadados. Fase 1: Cloud Storage privado. */
export interface StorageProvider {
  readonly name: string;
  put(meta: { caseId: string; fileName: string; mimeType: string; sizeBytes: number }): Promise<{ ref: string }>;
}
