import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeVariant = "neutral" | "success" | "info" | "warning" | "danger";

const STYLES: Record<BadgeVariant, string> = {
  // Reference StatusPill: 999px radius, 11–12px/600, dot + text. Colors come
  // from `--qz-*` role tokens (AA pairs recorded in docs/color-system.md).
  neutral: "bg-[var(--qz-surface-2)] text-[var(--qz-muted)] border border-[var(--qz-border)]",
  success: "bg-[var(--qz-success-soft)] text-[var(--qz-success)]",
  info: "bg-[var(--qz-info-soft)] text-[var(--qz-info)]",
  warning: "bg-[var(--qz-warning-soft)] text-[var(--qz-warning)]",
  danger: "bg-[var(--qz-danger-soft)] text-[var(--qz-danger)]",
};

const DOTS: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--qz-faint)]",
  success: "bg-[var(--qz-success)]",
  info: "bg-[var(--qz-info-dot)]",
  warning: "bg-[var(--qz-warning-dot)]",
  danger: "bg-[var(--qz-danger)]",
};

/// shadcn-style Badge with a status dot (reference StatusPill language).
export function Badge({
  variant = "neutral",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-4 font-semibold tracking-wide",
        STYLES[variant],
        className,
      )}
      {...rest}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[variant])} aria-hidden />
      {children}
    </span>
  );
}
