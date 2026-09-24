"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toasts: o texto repete o verbo do botão ("Enviar documentos" → "Documentos enviados"). */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-rule !bg-surface !text-ink !shadow-float !font-sans !text-ui",
          description: "!text-ink-soft !text-meta",
          actionButton: "!bg-ink !text-white",
          cancelButton: "!bg-tint !text-ink",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
