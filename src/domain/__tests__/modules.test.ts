import { describe, expect, it } from "vitest";

import { DomainError } from "@/domain/context";
import { publishPolicyVersion } from "@/domain/services/content";
import { inventory, myEquipment, registerEquipment, suggestAssetTag } from "@/domain/services/equipment-queries";
import { acceptEquipmentTerm, acknowledgePolicy, assignEquipment } from "@/domain/services/onboarding";
import { ackMatrix, myPolicies, policyDetail } from "@/domain/services/policy-queries";
import { saveTimesheet, teamWeek, timesheetWeek } from "@/domain/services/timesheets";

import { auditOf, createAna, createTestDomain, outboxByTemplate, RH } from "./helpers";

const MONDAY = "2026-09-21";
const LAST_MONDAY = "2026-09-14";

describe("políticas: status do aceite e matriz", () => {
  it("equipe: re-aceite pendente só da Política de Viagens v2 para o Alessandro", async () => {
    const { ctx } = await createTestDomain();
    const mine = await myPolicies(ctx, "alessandro-benetti");
    const travel = mine.find((p) => p.id === "politica-de-viagens")!;
    expect(travel.my).toMatchObject({ state: "reaceite", ackedVersion: 1, canAcknowledge: true });
    expect(mine.filter((p) => p.my.canAcknowledge)).toHaveLength(1);

    const matrix = await ackMatrix(ctx);
    expect(matrix.pendingTotal).toBe(1);
    expect(matrix.rows[0]?.person.id).toBe("alessandro-benetti");

    await acknowledgePolicy(ctx, "alessandro-benetti", "politica-de-viagens", "alessandro-benetti");
    expect((await ackMatrix(ctx)).pendingTotal).toBe(0);
  });

  it("new joiner: aceites das políticas do fluxo ficam na jornada até a etapa liberar", async () => {
    const { ctx } = await createTestDomain();
    const { personId } = await createAna(ctx);
    const mine = await myPolicies(ctx, personId);
    const byId = Object.fromEntries(mine.map((p) => [p.id, p.my]));
    expect(byId["aviso-de-privacidade"]).toMatchObject({ state: "na_jornada", canAcknowledge: false });
    expect(byId["politica-de-viagens"]).toMatchObject({ state: "na_jornada", canAcknowledge: false });
    expect(byId["politica-de-viagens"]?.journey?.stageTitle).toBe("Políticas e benefícios");
    const detail = await policyDetail(ctx, personId, "politica-de-viagens");
    expect(detail.my.canAcknowledge).toBe(false);
    // Na matriz, "na jornada" não conta como pendência.
    const row = (await ackMatrix(ctx)).rows.find((r) => r.person.id === personId);
    expect(row?.pending).toBe(0);
  });

  it("nova versão publicada cria re-aceite pendente para a equipe (A18)", async () => {
    const { ctx } = await createTestDomain();
    await acknowledgePolicy(ctx, "alessandro-benetti", "politica-de-viagens", "alessandro-benetti");
    await publishPolicyVersion(
      ctx,
      {
        policyId: "politica-de-viagens",
        summary: "Viagens a trabalho: aprovação, compra, reembolso e prestação de contas.",
        bodyMd: "## Quem aprova\n\nToda viagem precisa de aprovação do gestor do projeto antes da compra.",
        changelog: "Teto de hospedagem atualizado.",
        effectiveFrom: "2026-10-01",
      },
      RH,
    );
    const matrix = await ackMatrix(ctx);
    expect(matrix.policies.find((p) => p.id === "politica-de-viagens")).toMatchObject({ version: 3, pending: 4 });
    const enzo = (await myPolicies(ctx, "enzo-craveiro")).find((p) => p.id === "politica-de-viagens")!;
    expect(enzo.my).toMatchObject({ state: "reaceite", ackedVersion: 2 });
    const detail = await policyDetail(ctx, "enzo-craveiro", "politica-de-viagens", 2);
    expect(detail).toMatchObject({ shownVersion: 2, isCurrent: false });
    expect(detail.versions.map((v) => v.version)).toEqual([3, 2, 1]);
  });
});

describe("equipamentos", () => {
  it("cadastra com patrimônio sugerido e recusa duplicado", async () => {
    const { ctx } = await createTestDomain();
    expect(await suggestAssetTag(ctx, "notebook")).toBe("MON-NB-007");
    expect(await suggestAssetTag(ctx, "headset")).toBe("MON-HS-001");
    const item = await registerEquipment(ctx, { assetTag: "mon-nb-007", type: "notebook", model: "Notebook 14", serial: "SN-X-1" }, RH);
    expect(item).toMatchObject({ assetTag: "MON-NB-007", status: "disponivel" });
    await expect(
      registerEquipment(ctx, { assetTag: "MON-NB-007", type: "notebook", model: "Notebook 14", serial: "SN-X-2" }, RH),
    ).rejects.toBeInstanceOf(DomainError);
    expect(await auditOf(ctx, "equipment.created")).toHaveLength(1);
  });

  it("colaborador recebe notebook e aceita o termo em Meus equipamentos", async () => {
    const { ctx } = await createTestDomain();
    await assignEquipment(ctx, "eq-nb-001", "enzo-craveiro", RH);
    const before = await myEquipment(ctx, "enzo-craveiro");
    const notebook = before.items.find((i) => i.id === "eq-nb-001")!;
    expect(notebook).toMatchObject({ termRequired: true, termAcceptedAt: undefined });
    expect((await inventory(ctx)).counts.termoPendente).toBe(1);
    await acceptEquipmentTerm(ctx, "eq-nb-001", "enzo-craveiro");
    const after = await myEquipment(ctx, "enzo-craveiro");
    expect(after.items.find((i) => i.id === "eq-nb-001")?.termAcceptedAt).toBeDefined();
    // Sem caso de onboarding, nenhuma regra de new joiner dispara.
    expect(await outboxByTemplate(ctx, "termo-notebook")).toHaveLength(0);
  });

  it("monitor para quem está no onboarding não dispara o termo do notebook (A11)", async () => {
    const { ctx } = await createTestDomain();
    const { personId } = await createAna(ctx);
    await assignEquipment(ctx, "eq-mn-002", personId, RH);
    expect(await outboxByTemplate(ctx, "termo-notebook")).toHaveLength(0);
    const mine = await myEquipment(ctx, personId);
    expect(mine.items[0]).toMatchObject({ type: "monitor", termRequired: false, name: 'Monitor 27" QHD' });
    expect(mine.notebookPending).toBe(true);
    // Antes do contrato, os acessos aparecem só no resumo "aguardando contrato".
    const inv = await inventory(ctx);
    expect(inv.waitingContract.find((w) => w.person.id === personId)?.systems).toHaveLength(3);
    expect(inv.pendingAccess.some((g) => g.person.id === personId)).toBe(false);
  });
});

describe("apontamento semanal", () => {
  it("semana nova começa com os projetos da semana anterior", async () => {
    const { ctx } = await createTestDomain();
    const view = await timesheetWeek(ctx, "guilherme-bonfitto");
    expect(view.isNew).toBe(true);
    expect(view.week.weekStart).toBe(MONDAY);
    expect(view.week.rows.map((r) => r.projectId)).toEqual(["cliente-a-manutencao", "cliente-c-supply", "interno-propostas"]);
    expect(view.days.map((d) => d.editable)).toEqual([true, true, true, true, false]);
    expect(view.nextWeekStart).toBeUndefined();
    await expect(timesheetWeek(ctx, "guilherme-bonfitto", "2026-09-28")).rejects.toBeInstanceOf(DomainError);
    await expect(timesheetWeek(ctx, "guilherme-bonfitto", "2026-09-22")).rejects.toBeInstanceOf(DomainError);
  });

  it("valida horas, salva rascunho, envia e trava a semana", async () => {
    const { ctx } = await createTestDomain();
    const who = "guilherme-bonfitto";
    const save = (hours: [number, number, number, number, number], submit = false) =>
      saveTimesheet(ctx, who, { weekStart: MONDAY, rows: [{ projectId: "cliente-a-manutencao", hours }], submit }, who);
    await expect(save([8, 8, 8, 8, 8])).rejects.toThrow("dias que ainda não chegaram");
    await expect(save([25, 0, 0, 0, 0])).rejects.toThrow("de 0 a 24");
    await expect(save([7.3, 0, 0, 0, 0])).rejects.toThrow("meia hora");
    await expect(save([0, 0, 0, 0, 0], true)).rejects.toThrow("ao menos uma hora");

    const draft = await save([8, 7.5, 8, 4, 0]);
    expect(draft.status).toBe("rascunho");
    expect((await timesheetWeek(ctx, who)).isNew).toBe(false);

    const sent = await save([8, 7.5, 8, 6, 0], true);
    expect(sent).toMatchObject({ status: "enviado" });
    expect(sent.submittedAt).toBeDefined();
    expect((await auditOf(ctx, "timesheet.submitted"))[0]?.payload).toMatchObject({ weekStart: MONDAY, total: 29.5 });
    await expect(save([8, 8, 8, 8, 0])).rejects.toThrow("já foi enviada");
  });

  it("visão da equipe soma horas por pessoa e projeto", async () => {
    const { ctx } = await createTestDomain();
    const team = await teamWeek(ctx, LAST_MONDAY);
    const totals = Object.fromEntries(team.rows.map((r) => [r.person.id, r.total]));
    expect(totals).toEqual({
      "alessandro-benetti": 38,
      "enzo-craveiro": 40,
      "guilherme-bonfitto": 40,
      "thiago-stepanoff": 38,
    });
    expect(team.totals).toMatchObject({ total: 156, submitted: 4 });
    expect(team.totals.byProject["cliente-b-sop"]).toBe(54);
    // Padrão: antes de sexta, a última semana completa.
    expect((await teamWeek(ctx)).weekStart).toBe(LAST_MONDAY);
  });
});
