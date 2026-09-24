import type { StorageProvider } from "./types";

/** Guarda só a referência: nenhum arquivo é lido ou gravado na Fase 0. */
export class SimulatedStorageProvider implements StorageProvider {
  readonly name = "Armazenamento simulado";
  private counter = 0;

  async put(meta: { caseId: string; fileName: string }): Promise<{ ref: string }> {
    this.counter += 1;
    const safe = meta.fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    return { ref: `simulado://${meta.caseId}/${this.counter}-${safe}` };
  }
}
