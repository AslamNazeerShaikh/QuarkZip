import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { THEME_OPTIONS, type ThemeChoice } from "./theme";

const CHOICE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/// Theme control: an icon button at rest, expanding to the Light / System /
/// Dark segmented control when opened. Closes on select, outside click, or
/// Escape.
export default function ThemeSwitch({
  choice,
  onChange,
}: {
  choice: ThemeChoice;
  onChange: (c: ThemeChoice) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = CHOICE_ICON[choice];

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function select(c: ThemeChoice) {
    onChange(c);
    setExpanded(false);
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Color theme"
      className="fixed right-4 bottom-4 flex items-center rounded-full border border-[var(--qz-border)] bg-[var(--qz-surface)]/80 p-1 shadow-lg backdrop-blur"
    >
      {expanded ? (
        THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={choice === opt.value}
            onClick={() => select(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${
              choice === opt.value
                ? "bg-[var(--qz-primary)] text-white dark:text-[var(--qz-bg)]"
                : "text-[var(--qz-muted)] hover:text-[var(--qz-text)]"
            }`}
          >
            {opt.label}
          </button>
        ))
      ) : (
        <button
          type="button"
          aria-label="Change theme"
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
          className="rounded-full p-2 text-[var(--qz-muted)] transition-colors duration-300 hover:text-[var(--qz-text)]"
        >
          <CurrentIcon size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
