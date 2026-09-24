import "@fontsource-variable/montserrat";
import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/components/shell/app-context";
import { AppHeader } from "@/components/shell/app-header";
import { AssistantLauncher } from "@/components/shell/assistant-launcher";
import { DemoPanel } from "@/components/shell/demo-panel";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { company } from "@/config/company";
import { getDomain } from "@/server/domain";
import { isDemoMode } from "@/server/env";
import { getSession, listPersonas } from "@/server/session";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: {
    default: company.productName,
    template: `%s · ${company.productName}`,
  },
  description: "Onboarding e pessoas da Monoda Consulting.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  themeColor: "#0E2A3B",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const domain = await getDomain();
  const [session, personas] = await Promise.all([getSession(), listPersonas(domain)]);
  const demoMode = isDemoMode();

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <TRPCReactProvider>
          <TooltipProvider>
            <AppProvider
              value={{
                session: {
                  id: session.id,
                  name: session.name,
                  firstName: session.firstName,
                  viewRole: session.viewRole,
                  rolesLabel: session.rolesLabel,
                  isManager: session.isManager,
                },
                personas,
                demoMode,
                productName: company.productName,
              }}
            >
              <a
                href="#conteudo"
                className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
              >
                Pular para o conteúdo
              </a>
              <AppHeader />
              <main id="conteudo" className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-28 sm:pt-8">
                {children}
              </main>
              <AssistantLauncher />
              <DemoPanel todayKey={domain.clock.todayKey()} />
            </AppProvider>
          </TooltipProvider>
        </TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
