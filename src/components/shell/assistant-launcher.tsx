"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, MessageCircleQuestion, RotateCcw } from "lucide-react";
import { useState } from "react";

import { AssistantComposer, AssistantConversation } from "@/components/assistant/assistant-chat";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { SourceInline } from "@/components/assistant/source-detail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Botão flutuante "Perguntar" em todas as páginas, exceto /assistente (seção 9.1): abre a mesma
 * conversa num painel lateral, com o histórico da sessão (seção 9.4).
 */
export function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const { entries, clear } = useAssistant();
  if (pathname === "/assistente") return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSourceId(null);
      }}
    >
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
        <SheetHeader className="gap-2">
          <SheetTitle>Assistente</SheetTitle>
          <SheetDescription>Respostas a partir da base de conhecimento da Monoda.</SheetDescription>
          <div className="-ml-2 flex flex-wrap gap-1">
            {entries.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clear}>
                <RotateCcw aria-hidden strokeWidth={1.75} />
                Nova conversa
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/assistente" onClick={() => setOpen(false)}>
                <Maximize2 aria-hidden strokeWidth={1.75} />
                Abrir página
              </Link>
            </Button>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sourceId ? (
            <SourceInline id={sourceId} onBack={() => setSourceId(null)} />
          ) : (
            <div className="p-4">
              <AssistantConversation
                onOpenSource={setSourceId}
                intro={
                  <p className="text-ink-soft">
                    Pergunte sobre onboarding, despesas, benefícios, equipamentos e rotina. Quando a base não cobre, o
                    assistente diz com quem falar.
                  </p>
                }
              />
            </div>
          )}
        </div>
        {sourceId ? null : (
          <div className="border-t border-rule p-4">
            <AssistantComposer autoFocus />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
