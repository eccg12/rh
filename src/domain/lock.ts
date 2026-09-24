/**
 * Exclusão mútua para comandos: um evento e todas as suas consequências rodam sem intercalar com
 * outro comando (o estado da Fase 0 vive em memória, num só processo).
 */
const g = globalThis as unknown as { __monodaLock?: Promise<unknown> };

export async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const previous = g.__monodaLock ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  g.__monodaLock = previous.then(() => current);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
  }
}
