import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "warning"
  | "accent"
  | "success"
  | "highlight";
type Size = "default" | "sm" | "bar" | "icon";

/// Every action variant shares the Pagination/ThemeSwitch shell chrome:
/// translucent material, 10px radius, 1px border, card shadow, centered
/// content at the h-9 chrome height (height itself comes from `size`).
/// Hues survive as translucent tints (`.qz-tint-*`) with body-text labels —
/// a hue fails AA on its own tint — so icons at usage sites carry the hue
/// (Extract Selected/ListChecks in accent, Extract All/Download in green).
const VARIANTS: Record<Variant, string> = {
  // Accent-tinted shell: the emphasized action without a solid fill.
  primary:
    "qz-tint-accent border border-[var(--qz-border)] text-[var(--qz-text)] hover:opacity-90",
  // Reference: material shell with 1px subtle border, dark text. Hover
  // uses a translucent wash (an opaque fill would kill the blur).
  secondary:
    "qz-material-bar border border-[var(--qz-border)] text-[var(--qz-text)] hover:bg-black/5 dark:hover:bg-white/10",
  ghost: "text-[var(--qz-text)] hover:bg-[var(--qz-surface-2)]",
  // Confirm dialogs: orange-tint Cancel, blue-tint Proceed.
  warning:
    "qz-tint-orange border border-[var(--qz-border)] text-[var(--qz-text)] hover:opacity-90",
  accent:
    "qz-tint-info border border-[var(--qz-border)] text-[var(--qz-text)] hover:opacity-90",
  // User-requested solid actions, softened to tinted shells (hues kept):
  // green Extract All, yellow Open.
  success:
    "qz-tint-green border border-[var(--qz-border)] text-[var(--qz-text)] hover:opacity-90",
  highlight:
    "qz-tint-yellow border border-[var(--qz-border)] text-[var(--qz-text)] hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
  // Chrome control height (36px): footer actions, card-row buttons,
  // titlebar actions — matches the Pagination/ThemeSwitch/Language shells
  // sitting in the same rows.
  bar: "h-9 px-3 text-[13px]",
  icon: "h-8 w-8",
};

/// shadcn-style Button: `variant` + `size` API, reference tokens underneath.
export function Button({
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap shadow-[var(--qz-shadow-card)] transition outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}
