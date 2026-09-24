"use client";

/**
 * Conversa do assistente compartilhada entre a página /assistente e o widget flutuante: o mesmo
 * histórico em qualquer tela, guardado na sessão do navegador por persona (seção 9.4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useApp } from "@/components/shell/app-context";
import type { AssistantEvent, AssistantMode, AssistantRoute, AssistantSource } from "@/server/assistant/answer";
import { api } from "@/trpc/react";

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "streaming" | "done" | "error" | "stopped";
  mode?: AssistantMode;
  sources?: AssistantSource[];
  route?: AssistantRoute;
  /** Id da resposta no servidor (para "Ajudou" / "Não ajudou"). */
  messageId?: string;
  /** Pergunta que originou a resposta, já mascarada. */
  question?: string;
  feedback?: "ajudou" | "nao_ajudou";
}

interface AssistantContextValue {
  entries: ChatEntry[];
  busy: boolean;
  /** A conversa guardada desta persona já foi carregada. */
  ready: boolean;
  ask: (question: string) => void;
  stop: () => void;
  clear: () => void;
  rate: (entryId: string, helpful: boolean) => void;
  /** Painel lateral (widget) aberto. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** Abre o widget e, se vier pergunta, já pergunta. */
  openAssistant: (question?: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

const HISTORY_SENT = 6;
const STORAGE_PREFIX = "monoda.assistente.";

let counter = 0;
function localId(): string {
  counter += 1;
  return `m${Date.now().toString(36)}${counter}`;
}

function load(key: string): ChatEntry[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatEntry[];
    // Resposta que estava chegando quando a página recarregou.
    return parsed.map((e) => (e.status === "streaming" ? { ...e, status: "stopped" } : e));
  } catch {
    return [];
  }
}

function save(key: string, entries: ChatEntry[]) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entries.slice(-40)));
  } catch {
    // armazenamento indisponível (navegação privada): a conversa vale só para esta página
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const first = (await response.text()).split("\n")[0] ?? "";
    const event = JSON.parse(first) as AssistantEvent;
    if (event.type === "error") return event.message;
  } catch {
    // resposta sem corpo
  }
  return "Não consegui responder agora. Tente de novo em instantes.";
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  const storageKey = `${STORAGE_PREFIX}${session.id}`;
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const entriesRef = useRef<ChatEntry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Carrega a conversa da persona atual depois da hidratação (o armazenamento do navegador não
  // existe no servidor) e troca quando a persona muda.
  useEffect(() => {
    abortRef.current?.abort();
    const timer = window.setTimeout(() => {
      setEntries(load(storageKey));
      setLoadedKey(storageKey);
      setBusy(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey === storageKey) save(storageKey, entries);
  }, [entries, loadedKey, storageKey]);

  const update = useCallback((id: string, fn: (e: ChatEntry) => ChatEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? fn(e) : e)));
  }, []);

  const ask = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || abortRef.current) return;
      const history = entriesRef.current
        .filter((e) => e.text && e.status !== "error")
        .slice(-HISTORY_SENT)
        .map((e) => ({ role: e.role, content: e.text }));
      const userId = localId();
      const botId = localId();
      setEntries((prev) => [
        ...prev,
        { id: userId, role: "user", text: question },
        { id: botId, role: "assistant", text: "", status: "streaming", question },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      const handle = (event: AssistantEvent) => {
        switch (event.type) {
          case "meta":
            update(botId, (e) => ({
              ...e,
              text: "",
              route: undefined,
              mode: event.mode,
              sources: event.sources,
              messageId: event.messageId,
              question: event.question,
            }));
            if (event.question !== question) update(userId, (e) => ({ ...e, text: event.question }));
            break;
          case "delta":
            update(botId, (e) => ({ ...e, text: e.text + event.text }));
            break;
          case "route": {
            const { type: _type, ...route } = event;
            update(botId, (e) => ({ ...e, route }));
            break;
          }
          case "done":
            update(botId, (e) => ({ ...e, status: "done" }));
            break;
          case "error":
            update(botId, (e) => ({ ...e, status: "error", text: e.text || event.message }));
            break;
        }
      };

      void (async () => {
        try {
          const response = await fetch("/api/assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, history }),
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            const message = await readError(response);
            update(botId, (e) => ({ ...e, status: "error", text: message }));
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline = buffer.indexOf("\n");
            while (newline >= 0) {
              const line = buffer.slice(0, newline).trim();
              buffer = buffer.slice(newline + 1);
              if (line) handle(JSON.parse(line) as AssistantEvent);
              newline = buffer.indexOf("\n");
            }
          }
          if (buffer.trim()) handle(JSON.parse(buffer) as AssistantEvent);
          update(botId, (e) => (e.status === "streaming" ? { ...e, status: "done" } : e));
        } catch {
          if (controller.signal.aborted) {
            update(botId, (e) => (e.status === "streaming" ? { ...e, status: "stopped" } : e));
          } else {
            update(botId, (e) => ({
              ...e,
              status: "error",
              text: e.text || "Não consegui responder agora. Verifique a conexão e tente de novo.",
            }));
          }
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
          setBusy(false);
        }
      })();
    },
    [update],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setEntries([]);
  }, []);

  const { mutate: sendFeedback } = api.assistant.feedback.useMutation();
  const rate = useCallback(
    (entryId: string, helpful: boolean) => {
      const entry = entriesRef.current.find((e) => e.id === entryId);
      if (!entry?.messageId || entry.feedback) return;
      update(entryId, (e) => ({ ...e, feedback: helpful ? "ajudou" : "nao_ajudou" }));
      sendFeedback({ messageId: entry.messageId, helpful, question: entry.question });
    },
    [sendFeedback, update],
  );

  const openAssistant = useCallback(
    (question?: string) => {
      if (question) ask(question);
      setPanelOpen(true);
    },
    [ask],
  );

  const ready = loadedKey === storageKey;
  const value = useMemo(
    () => ({ entries, busy, ready, ask, stop, clear, rate, panelOpen, setPanelOpen, openAssistant }),
    [entries, busy, ready, ask, stop, clear, rate, panelOpen, openAssistant],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant deve ser usado dentro de <AssistantProvider>");
  return ctx;
}
