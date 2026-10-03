import { cn } from "./utils";

/// Thin horizontal divider (#E7E7E3 language).
export function Separator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn("h-px w-full bg-[var(--qz-border)]", className)}
    />
  );
}
