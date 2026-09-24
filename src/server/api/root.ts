import { adminRouter } from "@/server/api/routers/admin";
import { assistantRouter } from "@/server/api/routers/assistant";
import { demoRouter } from "@/server/api/routers/demo";
import { equipmentRouter } from "@/server/api/routers/equipment";
import { healthRouter } from "@/server/api/routers/health";
import { expensesRouter, routineRouter } from "@/server/api/routers/modules";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { policiesRouter } from "@/server/api/routers/policies";
import { sessionRouter } from "@/server/api/routers/session";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  session: sessionRouter,
  demo: demoRouter,
  onboarding: onboardingRouter,
  assistant: assistantRouter,
  policies: policiesRouter,
  equipment: equipmentRouter,
  expenses: expensesRouter,
  routine: routineRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
