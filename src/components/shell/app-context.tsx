"use client";

import { createContext, useContext } from "react";

import type { ViewRole } from "@/domain/schemas";

export interface ClientSession {
  id: string;
  name: string;
  firstName: string;
  viewRole: ViewRole;
  rolesLabel: string;
  isManager: boolean;
}

export interface ClientPersona {
  id: string;
  name: string;
  rolesLabel: string;
  group: "equipe" | "new_joiner";
  subtitle?: string;
}

export interface AppContextValue {
  session: ClientSession;
  personas: ClientPersona[];
  /** Vem do servidor (DEMO_MODE), nunca de variável NEXT_PUBLIC_ (D-OB-13). */
  demoMode: boolean;
  productName: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>");
  return ctx;
}

export function useDemoMode(): boolean {
  return useApp().demoMode;
}

/** URL de troca de persona (Route Handler /entrar, D-OB-17). */
export function personaSwitchUrl(personaId: string, next: string): string {
  const params = new URLSearchParams({ persona: personaId, next });
  return `/entrar?${params.toString()}`;
}
