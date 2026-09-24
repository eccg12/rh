"use client";

import { usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Botão flutuante "Perguntar" em todas as páginas, exceto /assistente (seção 9.1). */
export function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/assistente") return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Perguntar ao assistente"
          className="fixed right-4 bottom-4 z-30 inline-flex size-12 items-center justify-center gap-2 rounded-full bg-ink font-medium text-white shadow-float transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto sm:px-5"
        >
          <MessageCircleQuestion aria-hidden className="size-5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Perguntar</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Assistente</SheetTitle>
          <SheetDescription>Respostas a partir da base de conhecimento da Monoda.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AssistantPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
