import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { THEME_OPTIONS, type ThemeChoice } from "../lib/theme";
import { useLanguage } from "../i18n/LanguageContext";

const CHOICE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/// Time the sliding indicator takes to reach the chosen option before the
/// control minimizes back to its icon.
const COLLAPSE_DELAY_MS = 400;

/// Theme control: an icon button at rest, expanding to the Light / System /
/// Dark segmented control when opened. Choosing an option slides an indicator
/// pill to it, then the control minimizes. Closes on outside click or Escape.
export default function ThemeSwitch({
  choice,
  onChange,
}: {
  choice: ThemeChoice;
  onChange: (c: ThemeChoice) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CurrentIcon = CHOICE_ICON[choice];
  const { t } = useLanguage();

  // Slide the indicator under the active option whenever it is visible.
  useLayoutEffect(() => {
    if (!expanded) return;
    const index = THEME_OPTIONS.findIndex((opt) => opt.value === choice);
    const el = buttonRefs.current[index];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [expanded, choice]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

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
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(
      () => setExpanded(false),
      COLLAPSE_DELAY_MS,
    );
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={t("theme.group")}
      // Relative: the sliding indicator is absolutely positioned and must
      // size against this shell — without it, it escapes to <main> and
      // renders as a full-height block.
      className="relative flex h-9 items-center rounded-[10px] border border-[var(--qz-border)] bg-[var(--qz-surface)] p-1 shadow-[var(--qz-shadow-card)]"
    >
      {expanded ? (
        <>
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-[8px] bg-[var(--qz-primary)] transition-all duration-180 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {THEME_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              type="button"
              aria-pressed={choice === opt.value}
              onClick={() => select(opt.value)}
              className={`relative z-10 inline-flex h-7 items-center rounded-[8px] px-3 font-medium transition-colors duration-300 ${
                choice === opt.value
                  ? "text-[var(--qz-on-primary)]"
                  : "text-[var(--qz-muted)] hover:text-[var(--qz-text)]"
              }`}
            >
              {opt.value === "light"
                ? t("theme.light")
                : opt.value === "dark"
                  ? t("theme.dark")
                  : t("theme.system")}
            </button>
          ))}
        </>
      ) : (
        <button
          type="button"
          aria-label={t("theme.change")}
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qz-muted)] transition-colors duration-300 hover:text-[var(--qz-text)]"
        >
          <CurrentIcon size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
