/** Controles do modo demo (seção 5): avançar o relógio virtual e restaurar os dados iniciais. */
import { recordAudit } from "../audit";
import { tickIfNewDay } from "../automation-engine";
import type { DomainContext } from "../context";

export async function advanceDay(ctx: DomainContext, actorId: string, days = 1): Promise<string> {
  const offset = await ctx.repo.getClockOffset();
  await ctx.repo.setClockOffset(offset + days);
  const today = ctx.clock.todayKey();
  await recordAudit(ctx, { type: "demo.day_advanced", actorId, payload: { date: today, offsetDays: offset + days } });
  await tickIfNewDay(ctx);
  return today;
}

export async function resetDemo(ctx: DomainContext, actorId: string): Promise<void> {
  await ctx.repo.reset();
  await recordAudit(ctx, { type: "demo.reset", actorId });
}
