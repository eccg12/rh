import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Markdown de conteúdo (políticas, artigos, termos). Links externos abrem em nova aba. */
export function Markdown({
  children,
  variant = "read",
  className,
}: {
  children: string;
  variant?: "read" | "chat";
  className?: string;
}) {
  return (
    <div className={cn(variant === "read" ? "prose-read" : "prose-chat", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => {
            const external = !!href && /^https?:\/\//.test(href);
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
