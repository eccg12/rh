import { demoRouter } from "@/server/api/routers/demo";
import { healthRouter } from "@/server/api/routers/health";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { sessionRouter } from "@/server/api/routers/session";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  session: sessionRouter,
  demo: demoRouter,
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
