import { describe, expect, it } from "vitest";

import { pjWorkflow } from "@/config/workflows/pj";
import { cltWorkflow } from "@/config/workflows/clt";
import {
  adminOverview,
  auditLog,
  auditToCsv,
  automationsAdmin,
  directoryAdmin,
  knowledgeAdmin,
} from "@/domain/services/admin-queries";
import { saveArticle, setRuleEnabled } from "@/domain/services/content";
import { describeWorkflow } from "@/domain/workflow-description";

import { createAna, createTestDomain, outboxByTemplate, RH } from "./helpers";

describe("Admin", () => {
  it("início mostra uma linha de contagem por área", async () => {
    const { ctx } = await createTestDomain();
    const { counts } = await adminOverview(ctx);
    expect(counts.automacoes).toMatch(/^19 de 19 regras ligadas/);
    expect(counts.politicas).toBe("5 políticas vigentes, 1 aceite pendente");
    expect(counts.beneficios).toBe("Bradesco Saúde");
    expect(counts["base-de-conhecimento"]).toMatch(/^11 artigos, /);
    expect(counts.demo).toBe("Data virtual 24/09/2026");
  });

  it("automações: conta disparos, mostra o último e respeita o desligar", async () => {
    const { ctx } = await createTestDomain();
    await createAna(ctx);
    const rules = await automationsAdmin(ctx);
    const a01 = rules.find((r) => r.id === "A01")!;
    expect(a01).toMatchObject({ enabled: true, firings: 1, trigger: "Caso criado" });
    expect(a01.lastFiring?.who).toBe("Ana Beatriz Moura");
    expect(a01.actions[0]).toMatch(/^E-mail ".+" para quem está entrando$/);
    expect(rules.find((r) => r.id === "A14")?.trigger).toBe("Verificação diária");
    expect(rules.find((r) => r.id === "A11")?.condition).toBe("Só quando o equipamento é notebook");

    await setRuleEnabled(ctx, "A01", false, RH);
    expect((await automationsAdmin(ctx)).find((r) => r.id === "A01")?.enabled).toBe(false);
    await createAna(ctx, { name: "Bia Teste", personalEmail: "bia.teste@pessoal.example" });
    expect(await outboxByTemplate(ctx, "boas-vindas")).toHaveLength(1);
  });

  it("auditoria filtra por pessoa, evento e origem e exporta CSV com fuso de São Paulo", async () => {
    const { ctx } = await createTestDomain();
    const { personId } = await createAna(ctx);
    const all = await auditLog(ctx);
    expect(all.rows.length).toBe(all.total);
    const mine = await auditLog(ctx, { personId });
    expect(mine.rows.every((r) => r.personId === personId)).toBe(true);
    const automatic = await auditLog(ctx, { personId, origin: "automatico" });
    expect(automatic.rows.length).toBeGreaterThan(0);
    expect(automatic.rows.every((r) => r.origin === "automatico")).toBe(true);
    const emails = await auditLog(ctx, { type: "email.sent" });
    expect(emails.rows.every((r) => r.type === "email.sent")).toBe(true);

    const csv = auditToCsv(mine.rows);
    expect(csv.startsWith("﻿data/hora (São Paulo);evento;detalhe;pessoa;quem fez;origem;regra")).toBe(true);
    // 24/09/2026 às 9h em São Paulo (12h UTC).
    expect(csv).toContain("24/09/2026 09:00");
    expect(csv).toContain(";automático;A01");
  });

  it("criar artigo a partir de uma lacuna resolve a lacuna", async () => {
    const { ctx } = await createTestDomain();
    const gap = await ctx.repo.assistant.insertGap({
      id: "gap-teste",
      question: "Tem estacionamento conveniado perto do escritório?",
      askedById: "enzo-craveiro",
      askedAt: "2026-09-20T12:00:00.000Z",
      status: "aberta",
      routedToId: "thiago-stepanoff",
    });
    const before = await knowledgeAdmin(ctx);
    expect(before.gaps[0]).toMatchObject({ id: gap.id, askedByName: "Enzo Craveiro", suggestedCategory: "geral" });
    const article = await saveArticle(
      ctx,
      {
        title: "Estacionamento perto do escritório",
        category: "geral",
        summary: "Onde estacionar perto do escritório e como pedir reembolso.",
        bodyMd: "Não há estacionamento conveniado. Prefira transporte por aplicativo nos dias de escritório.",
        tags: ["estacionamento"],
        isExample: true,
        fromGapId: gap.id,
      },
      RH,
    );
    const after = await knowledgeAdmin(ctx);
    expect(after.gaps.find((g) => g.id === gap.id)).toMatchObject({ status: "resolvida", resolvedArticleTitle: article.title });
  });

  it("quem é quem lista candidatos sem incluir quem está no onboarding", async () => {
    const { ctx } = await createTestDomain();
    const { personId } = await createAna(ctx);
    const dir = await directoryAdmin(ctx);
    expect(dir.entries.map((e) => e.personId)).toContain("thiago-stepanoff");
    expect(dir.candidates.some((c) => c.id === personId)).toBe(false);
  });

  it("fluxos em linguagem simples", () => {
    const pj = describeWorkflow(pjWorkflow);
    expect(pj.stages).toHaveLength(8);
    const checkin = pj.stages.flatMap((s) => s.tasks).find((t) => t.id === "primeiro-dia-checkin")!;
    expect(checkin.unlock).toContain("a partir da data de início");
    expect(pj.stages.flatMap((s) => s.tasks).find((t) => t.id === "cadastro")?.unlock).toBe("Liberada no cadastro");
    expect(pj.stages.flatMap((s) => s.tasks).find((t) => t.id === "notebook-termo")?.appliesWhen).toBeDefined();
    const clt = describeWorkflow(cltWorkflow);
    expect(clt.badge).toBe("Fluxo em validação com a contabilidade");
    expect(clt.totals.tasks).toBeGreaterThan(pj.totals.tasks);
  });
});
