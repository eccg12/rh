import { beforeAll, describe, expect, it } from "vitest";

import { VirtualClock } from "@/domain/clock";
import type { DomainContext } from "@/domain/context";
import { isValidCnpj, isValidCpf } from "@/domain/samples";
import { onboardingOverview } from "@/domain/services/onboarding-queries";
import { loadCaseView } from "@/domain/workflow-engine";
import { MemoryRepository } from "@/server/data/memory-repository";
import { buildSeedState } from "@/server/data/seed";
import type { MemoryState } from "@/server/data/state";
import { OutboxEmailProvider } from "@/server/providers/email/outbox-provider";
import { SimulatedSignatureProvider } from "@/server/providers/signature/simulated-provider";
import { SimulatedStorageProvider } from "@/server/providers/storage/simulated-provider";

const NOW = "2026-09-24T15:00:00.000Z"; // 12h em São Paulo

let state: MemoryState;
let ctx: DomainContext;

beforeAll(async () => {
  state = await buildSeedState({ now: new Date(NOW) });
  const store = { state };
  const repo = new MemoryRepository(store);
  const clock = new VirtualClock(() => store.state.clockOffsetDays, () => Date.parse(NOW));
  ctx = {
    repo,
    clock,
    email: new OutboxEmailProvider(repo, clock),
    signature: new SimulatedSignatureProvider(),
    storage: new SimulatedStorageProvider(),
    appUrl: "http://localhost:3000",
    demoMode: true,
  };
});

describe("seed (seção 11)", () => {
  it("cria os seis casos nas situações do plano", async () => {
    const status = Object.fromEntries(state.cases.map((c) => [c.personId, c.status]));
    expect(status).toEqual({
      "bruno-almeida": "em_andamento",
      "rafael-nogueira": "em_andamento",
      "juliana-prado": "em_andamento",
      "lucas-ferraz": "em_andamento",
      "marina-takeda": "concluido",
      "carolina-reis": "concluido",
    });
    const rafael = await loadCaseView(ctx, "caso-rafael-nogueira");
    expect(rafael.snapshot.contract?.status).toBe("enviado");
    expect(rafael.tasks.find((t) => t.def.id === "quiz-compliance")?.status).toBe("disponivel");
    const juliana = await loadCaseView(ctx, "caso-juliana-prado");
    expect(juliana.snapshot.equipment.find((e) => e.assetTag === "MON-NB-004")?.termAcceptedAt).toBeUndefined();
    expect(juliana.snapshot.accessGrants.filter((g) => g.status === "liberado")).toHaveLength(2);
    const lucas = await loadCaseView(ctx, "caso-lucas-ferraz");
    const docs = lucas.snapshot.documents.filter((d) => !d.supersededById);
    expect(docs.filter((d) => d.status === "enviado")).toHaveLength(5);
    expect(docs.find((d) => d.requirementId === "residencia")?.rejectionReason).toBe("Ilegível");
  });

  it("gera lead time médio de 12,5 dias e o gargalo em Cadastro e documentos", async () => {
    const o = await onboardingOverview(ctx);
    expect(o.leadTimeDays).toBeCloseTo(12.5, 5);
    const bottleneck = o.stages.find((s) => s.isBottleneck);
    expect(bottleneck?.id).toBe("cadastro-documentos");
    expect(o.stages.find((s) => s.id === "primeiro-dia")?.avgDays).toBeNull();
  });

  it("lista o que depende do RH, do mais antigo para o mais novo", async () => {
    const o = await onboardingOverview(ctx);
    const rows = o.pending.map((p) => `${p.personName}: ${p.taskTitle}`);
    expect(rows).toEqual([
      "Lucas Ferraz: Agendar exame admissional",
      "Lucas Ferraz: Revisar documentos",
      "Juliana Prado: Liberar acessos",
    ]);
  });

  it("conta ações automáticas recentes e registra e-mails coerentes com o histórico", async () => {
    const o = await onboardingOverview(ctx);
    expect(o.automations.total30d).toBeGreaterThan(20);
    expect(o.automations.recent).toHaveLength(5);
    const templates = new Set(state.outbox.map((e) => e.templateId));
    for (const t of ["boas-vindas", "rh-documentos-recebidos", "documento-rejeitado", "contrato-para-assinatura", "rh-onboarding-concluido", "vespera-primeiro-dia", "lembrete-pendencia"]) {
      expect(templates.has(t)).toBe(true);
    }
  });

  it("nunca usa CPF ou CNPJ válidos e só e-mails de domínio reservado para new joiners", () => {
    for (const form of state.formResponses) {
      if (form.values.cpf) expect(isValidCpf(String(form.values.cpf))).toBe(false);
      if (form.values.cnpj) expect(isValidCnpj(String(form.values.cnpj))).toBe(false);
    }
    for (const p of state.people.filter((x) => x.roles.includes("NEW_JOINER"))) {
      expect(p.personalEmail.endsWith(".example")).toBe(true);
    }
  });

  it("marca todo conteúdo carregado como exemplo", () => {
    expect(state.policies.every((p) => p.isExample)).toBe(true);
    expect(state.articles.every((a) => a.isExample)).toBe(true);
    expect(state.benefitPlans.every((b) => b.isExample)).toBe(true);
    expect(state.quiz.isExample && state.video.isExample && state.firstDay.isExample).toBe(true);
  });
});
