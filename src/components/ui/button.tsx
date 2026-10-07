import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

type Variant = "primary" | "secondary" | "ghost" | "warning" | "accent";
type Size = "default" | "sm" | "bar" | "icon";

const VARIANTS: Record<Variant, string> = {
  // Reference: solid accent CTA h38–42, 8–10px radius, 14px/500 white.
  // Transparent border keeps the fill box identical to the bordered
  // secondary buttons sharing the row (border-box makes the 1px outline
  // eat into their fill, so a borderless primary would read 2px bigger).
  primary:
    "bg-[var(--qz-primary)] text-[var(--qz-on-primary)] border border-transparent hover:bg-[var(--qz-primary-hover)]",
  // Reference: white with 1px subtle border, dark text.
  secondary:
    "bg-[var(--qz-surface)] text-[var(--qz-text)] border border-[var(--qz-border)] hover:bg-[var(--qz-surface-2)]",
  ghost: "text-[var(--qz-text)] hover:bg-[var(--qz-surface-2)]",
  // Confirm dialog: orange Cancel, blue Proceed (AA pairs in color-system).
  warning:
    "bg-[var(--qz-warning-soft)] text-[var(--qz-warning)] hover:opacity-80",
  accent:
    "bg-[var(--qz-info)] text-[var(--qz-on-primary)] border border-transparent hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
  // Footer action bar: 36px tall to match the Pagination/ThemeSwitch shells
  // sitting in the same row.
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[9px] font-medium whitespace-nowrap transition-colors outline-none select-none",
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
