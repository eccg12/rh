"use client";

import { MessageCircleQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAssistant } from "./assistant-provider";

/** "Perguntar ao assistente": abre o widget na mesma tela, com a pergunta quando houver. */
export function AskAssistantButton({
  question,
  children = "Perguntar ao assistente",
  variant = "outline",
  size = "default",
  className,
}: {
  question?: string;
  children?: React.ReactNode;
  variant?: "outline" | "ghost" | "default" | "link";
  size?: "default" | "sm";
  className?: string;
}) {
  const { openAssistant } = useAssistant();
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => openAssistant(question)}>
      <MessageCircleQuestion aria-hidden strokeWidth={1.75} />
      {children}
    </Button>
  );
}
