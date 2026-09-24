import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge precisa conhecer a escala tipográfica própria (text-meta, text-ui…); sem isso,
 * ela trata `text-meta` como cor e descarta `text-primary-foreground` (texto some no botão) ou o
 * tamanho do selo. Ver docs/DESIGN.md, seção 4.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["meta", "ui", "read", "section", "page", "hero"],
      shadow: ["float"],
    },
  },
});

/** Junta classes do Tailwind resolvendo conflitos (padrão shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
