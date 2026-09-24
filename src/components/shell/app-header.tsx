"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useApp } from "./app-context";
import { LogoMark } from "./logo";
import { ModuleTabs } from "./module-tabs";
import { PersonaMenu } from "./persona-menu";

/** Cabeçalho fixo em duas faixas: marca e controles; abas por papel (seção 9.1). */
export function AppHeader() {
  const { session, productName } = useApp();
  const pathname = usePathname();
  const isRh = session.viewRole === "ADMIN_RH";
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-surface">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <LogoMark className="size-5" />
          <span className="text-ui font-semibold tracking-[-0.01em]">
            <span className="sr-only">Início — </span>
            {productName}
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {isRh ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin"
                  aria-label="Admin"
                  aria-current={adminActive ? "page" : undefined}
                  className={cn(
                    "hidden size-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-ink sm:flex",
                    adminActive && "bg-tint",
                  )}
                >
                  <Settings aria-hidden className="size-5" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Admin</TooltipContent>
            </Tooltip>
          ) : null}
          <PersonaMenu />
        </div>
      </div>
      <nav aria-label="Módulos" className="mx-auto max-w-[1200px] px-4">
        <ModuleTabs role={session.viewRole} />
      </nav>
    </header>
  );
}
