import { outbox } from "@/domain/services/admin-queries";
import { createTRPCRouter, rhProcedure } from "@/server/api/trpc";

export const adminRouter = createTRPCRouter({
  outbox: rhProcedure.query(({ ctx }) => outbox(ctx.domain)),
});
