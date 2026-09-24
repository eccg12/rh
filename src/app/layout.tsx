import "@fontsource-variable/montserrat";
import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";

import { Toaster } from "@/components/ui/sonner";
import { company } from "@/config/company";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
