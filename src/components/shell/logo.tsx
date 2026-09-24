import { brand } from "@/config/brand";

/** Logo provisório (textual) até o arquivo oficial chegar em public/brand/. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect x="0" y="0" width="20" height="20" rx="4" fill={brand.colors.ink} />
      <rect x="6.5" y="6.5" width="7" height="7" rx="1.5" fill={brand.colors.signal} />
    </svg>
  );
}
