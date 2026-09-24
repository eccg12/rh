"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Menu, Settings } from "lucide-react";

import { PersonAvatar } from "@/components/common/person-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { personaSwitchUrl, useApp, type ClientPersona } from "./app-context";

function PersonaItems({ personas, currentId }: { personas: ClientPersona[]; currentId: string }) {
  const pathname = usePathname();
  const groups: { id: ClientPersona["group"]; label: string }[] = [
    { id: "equipe", label: "Equipe Monoda" },
    { id: "new_joiner", label: "New joiners em onboarding" },
  ];
  return (
    <>
      {groups.map((g, gi) => {
        const items = personas.filter((p) => p.group === g.id);
        if (items.length === 0) return null;
        return (
          <DropdownMenuGroup key={g.id}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
            {items.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => {
                  window.location.assign(personaSwitchUrl(p.id, pathname));
                }}
                className="items-start"
              >
                <PersonAvatar name={p.name} size="sm" className="mt-0.5" />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="truncate text-meta text-ink-soft">{p.subtitle ?? p.rolesLabel}</span>
                </span>
                {p.id === currentId ? <Check aria-label="Persona atual" className="mt-1 size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        );
      })}
    </>
  );
}

/**
 * Seletor "Ver como" (modo demo). No desktop, botão com avatar, nome e papel; no celular, vira o
 * menu do cabeçalho, que também leva ao Admin (seção 9.1).
 */
export function PersonaMenu() {
  const { session, personas, demoMode } = useApp();
  const isRh = session.viewRole === "ADMIN_RH";

  if (!demoMode) {
    return (
      <span className="flex items-center gap-2 pl-1">
        <PersonAvatar name={session.name} />
        <span className="hidden text-meta font-medium sm:inline">{session.name}</span>
      </span>
    );
  }

  return (
    <>
      {/* Desktop */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="hidden h-11 gap-2 px-2 sm:inline-flex" aria-label={`Ver como: ${session.name}. Trocar persona`}>
            <PersonAvatar name={session.name} />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-medium text-ink-soft">Ver como</span>
              <span className="text-meta font-semibold">{session.name}</span>
            </span>
            <span className="rounded-sm bg-tint px-1.5 py-0.5 text-[11px] font-medium text-ink">{session.rolesLabel}</span>
            <ChevronDown aria-hidden className="size-4 text-ink-soft" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <PersonaItems personas={personas} currentId={session.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Celular */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menu">
            <Menu aria-hidden className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2 text-ink">
            <PersonAvatar name={session.name} size="sm" />
            <span className="flex flex-col leading-tight">
              <span className="text-meta font-semibold">Ver como {session.firstName}</span>
              <span className="text-[11px] font-medium text-ink-soft">{session.rolesLabel}</span>
            </span>
          </DropdownMenuLabel>
          {isRh ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Settings aria-hidden />
                  Admin
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <PersonaItems personas={personas} currentId={session.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
