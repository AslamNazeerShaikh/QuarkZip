import type { HTMLAttributes } from "react";
import { cn } from "./utils";

/// shadcn-style Card: white, 12–14px radius, 1px subtle border, ~no shadow.
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-[var(--qz-border)] bg-[var(--qz-surface)] text-[var(--qz-text)] shadow-[var(--qz-shadow-card)]",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-1", className)} {...rest} />;
}

/// Reference page title: 15–18px, 600.
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-[16px] leading-6 font-semibold", className)} {...rest} />
  );
}

/// Reference secondary: 13px #666.
export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-[13px] text-[var(--qz-muted)]", className)} {...rest} />
  );
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-2 pb-5", className)} {...rest} />;
}
