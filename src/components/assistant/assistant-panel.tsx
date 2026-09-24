"use client";

import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

import { SUGGESTED_QUESTIONS } from "./suggested-questions";

/** Painel do assistente (widget flutuante). A conversa completa chega com o motor do assistente. */
export function AssistantPanel() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-ink-soft">Pergunte sobre onboarding, despesas, benefícios, equipamentos e rotina.</p>
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {SUGGESTED_QUESTIONS.map((q) => (
          <li key={q}>
            <Link
              href={`/assistente?q=${encodeURIComponent(q)}`}
              className="flex items-start gap-2 px-3 py-2.5 hover:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
              {q}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
