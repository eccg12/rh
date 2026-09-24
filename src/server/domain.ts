import "server-only";

/**
 * Contexto de domínio do app (Fase 0): estado em memória num singleton em `globalThis` (sobrevive
 * ao hot reload), relógio virtual com o deslocamento guardado no estado e provedores simulados.
 */
import { tickIfNewDay } from "@/domain/automation-engine";
import { VirtualClock } from "@/domain/clock";
import type { DomainContext } from "@/domain/context";
import { runExclusive } from "@/domain/lock";
import { MemoryRepository, type MemoryStore } from "@/server/data/memory-repository";
import { buildSeedState } from "@/server/data/seed";
import { createEmptyState } from "@/server/data/state";
import { appUrl, isDemoMode } from "@/server/env";
import { OutboxEmailProvider } from "@/server/providers/email/outbox-provider";
import { SimulatedSignatureProvider } from "@/server/providers/signature/simulated-provider";
import { SimulatedStorageProvider } from "@/server/providers/storage/simulated-provider";

interface Holder {
  store: MemoryStore;
  ready?: Promise<void>;
}

const g = globalThis as unknown as { __monodaStore?: Holder };

function holder(): Holder {
  g.__monodaStore ??= { store: { state: createEmptyState() } };
  return g.__monodaStore;
}

function seedOptions() {
  return { appUrl: appUrl(), demoMode: isDemoMode() };
}

let cached: { ctx: DomainContext; store: MemoryStore } | undefined;

function buildContext(store: MemoryStore): DomainContext {
  const repo = new MemoryRepository(store, () => buildSeedState(seedOptions()));
  const clock = new VirtualClock(() => store.state.clockOffsetDays);
  return {
    repo,
    clock,
    email: new OutboxEmailProvider(repo, clock),
    signature: new SimulatedSignatureProvider(),
    storage: new SimulatedStorageProvider(),
    appUrl: appUrl(),
    demoMode: isDemoMode(),
  };
}

/** Contexto pronto (com o seed carregado na primeira chamada). */
export async function getDomain(): Promise<DomainContext> {
  const h = holder();
  h.ready ??= (async () => {
    h.store.state = await buildSeedState(seedOptions());
  })();
  await h.ready;
  if (!cached || cached.store !== h.store) cached = { ctx: buildContext(h.store), store: h.store };
  return cached.ctx;
}

/** Vira o dia se a data virtual mudou desde a última virada (lembretes e véspera, seção 8.5). */
export async function ensureDailyTick(ctx: DomainContext): Promise<void> {
  const last = await ctx.repo.meta.getLastTickDate();
  if (last === ctx.clock.todayKey()) return;
  await runExclusive(() => tickIfNewDay(ctx));
}
