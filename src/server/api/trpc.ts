/**
 * tRPC: contexto (domínio + persona do cookie), procedimentos por papel e mapeamento de erros.
 * Mutações rodam em exclusão mútua (o estado da Fase 0 vive em memória).
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { DomainError } from "@/domain/context";
import { runExclusive } from "@/domain/lock";
import { ensureDailyTick, getDomain } from "@/server/domain";
import { personaFromCookieHeader, resolveSession } from "@/server/session";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const domain = await getDomain();
  await ensureDailyTick(domain);
  const session = await resolveSession(domain, personaFromCookieHeader(opts.headers.get("cookie")));
  return { headers: opts.headers, domain, session };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? z.flattenError(error.cause) : null,
      },
    };
  },
});

const CODE: Record<DomainError["code"], TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  INVALID: "BAD_REQUEST",
};

/** Erro de regra de negócio vira erro tRPC com a mensagem pronta para a interface. */
const domainErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof DomainError) {
    throw new TRPCError({ code: CODE[result.error.cause.code], message: result.error.cause.message, cause: result.error.cause });
  }
  return result;
});

const exclusive = t.middleware(async ({ type, next }) => (type === "mutation" ? runExclusive(() => next()) : next()));

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure.use(domainErrors).use(exclusive);

/** Qualquer persona. */
export const sessionProcedure = publicProcedure;

/** Só RH (ADMIN_RH). */
export const rhProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.session.viewRole !== "ADMIN_RH") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Disponível só para o RH." });
  }
  return next();
});

/** RH ou gestor. */
export const managerProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session.isManager) throw new TRPCError({ code: "FORBIDDEN", message: "Disponível para RH e gestores." });
  return next();
});

/** New joiner com caso de onboarding. */
export const joinerProcedure = publicProcedure.use(({ ctx, next }) => {
  const caseId = ctx.session.caseId;
  if (ctx.session.viewRole !== "NEW_JOINER" || !caseId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Disponível para quem está em onboarding." });
  }
  return next({ ctx: { ...ctx, caseId } });
});
