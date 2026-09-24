import { VirtualClock } from "@/domain/clock";
import type { DomainContext } from "@/domain/context";
import type { CreateCaseInput } from "@/domain/inputs";
import { sampleFormValues } from "@/domain/samples";
import { createCase } from "@/domain/services/onboarding";
import { MemoryRepository, type MemoryStore } from "@/server/data/memory-repository";
import { buildBaseState } from "@/server/data/seed";
import { OutboxEmailProvider } from "@/server/providers/email/outbox-provider";
import { SimulatedSignatureProvider } from "@/server/providers/signature/simulated-provider";
import { SimulatedStorageProvider } from "@/server/providers/storage/simulated-provider";
import { addDaysKey } from "@/lib/dates";

export const RH = "thiago-stepanoff";
/** 24/09/2026 às 9h em São Paulo. */
export const BASE_NOW = "2026-09-24T12:00:00.000Z";

export interface TestDomain {
  ctx: DomainContext;
  store: MemoryStore;
  /** Avança o relógio "real" (horas dentro do dia). */
  later: (ms: number) => void;
}

export async function createTestDomain(now: string = BASE_NOW): Promise<TestDomain> {
  const state = await buildBaseState({ now: new Date(now) });
  const store: MemoryStore = { state };
  let real = Date.parse(now);
  const repo = new MemoryRepository(store, () => buildBaseState({ now: new Date(now) }));
  const clock = new VirtualClock(() => store.state.clockOffsetDays, () => real);
  const ctx: DomainContext = {
    repo,
    clock,
    email: new OutboxEmailProvider(repo, clock),
    signature: new SimulatedSignatureProvider(),
    storage: new SimulatedStorageProvider(),
    appUrl: "http://localhost:3000",
    demoMode: true,
  };
  return { ctx, store, later: (ms) => void (real += ms) };
}

export function newJoinerInput(ctx: DomainContext, overrides: Partial<CreateCaseInput> = {}): CreateCaseInput {
  return {
    name: "Ana Beatriz Moura",
    personalEmail: "ana.moura@pessoal.example",
    phone: "(11) 90000-0199",
    regime: "PJ",
    jobTitle: "Analista",
    startDate: addDaysKey(ctx.clock.todayKey(), 14),
    managerId: "alessandro-benetti",
    initialProjectId: "cliente-b-sop",
    needsNotebook: true,
    contractMode: "modelo",
    contractTemplateId: "pj-padrao",
    ...overrides,
  };
}

export async function createAna(ctx: DomainContext, overrides: Partial<CreateCaseInput> = {}) {
  return createCase(ctx, newJoinerInput(ctx, overrides), RH);
}

export async function formValuesFor(ctx: DomainContext, personId: string) {
  const person = await ctx.repo.people.get(personId);
  const c = await ctx.repo.cases.getByPerson(personId);
  if (!person || !c) throw new Error("pessoa ou caso ausente");
  return sampleFormValues(c.regime, person);
}

export async function outboxByTemplate(ctx: DomainContext, templateId: string) {
  return (await ctx.repo.email.listOutbox()).filter((e) => e.templateId === templateId);
}

export async function auditOf(ctx: DomainContext, type: string, caseId?: string) {
  return (await ctx.repo.audit.list()).filter((e) => e.type === type && (!caseId || e.caseId === caseId));
}
