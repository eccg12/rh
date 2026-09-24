import { z } from "zod";

import { EquipmentTypeSchema } from "@/domain/schemas";
import { NewEquipmentInputSchema } from "@/domain/inputs";
import { inventory, myEquipment, registerEquipment, suggestAssetTag } from "@/domain/services/equipment-queries";
import { acceptEquipmentTerm, assignEquipment, grantAccess } from "@/domain/services/onboarding";
import { createTRPCRouter, rhProcedure, sessionProcedure } from "@/server/api/trpc";

/** Equipamentos e acessos (seção 9.6). */
export const equipmentRouter = createTRPCRouter({
  mine: sessionProcedure.query(({ ctx }) => myEquipment(ctx.domain, ctx.session.id)),

  acceptTerm: sessionProcedure
    .input(z.object({ equipmentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await acceptEquipmentTerm(ctx.domain, input.equipmentId, ctx.session.id);
      return { ok: true as const };
    }),

  inventory: rhProcedure.query(({ ctx }) => inventory(ctx.domain)),

  suggestAssetTag: rhProcedure
    .input(z.object({ type: EquipmentTypeSchema }))
    .query(({ ctx, input }) => suggestAssetTag(ctx.domain, input.type)),

  register: rhProcedure
    .input(NewEquipmentInputSchema)
    .mutation(({ ctx, input }) => registerEquipment(ctx.domain, input, ctx.session.id)),

  assign: rhProcedure
    .input(z.object({ equipmentId: z.string().min(1), personId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assignEquipment(ctx.domain, input.equipmentId, input.personId, ctx.session.id);
      return { ok: true as const };
    }),

  grantAccess: rhProcedure.input(z.object({ grantId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    await grantAccess(ctx.domain, input.grantId, ctx.session.id);
    return { ok: true as const };
  }),
});
