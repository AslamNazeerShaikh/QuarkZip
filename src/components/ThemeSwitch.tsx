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
///
/// Controlled when `expanded` is passed (the parent also collapses the
/// pagination shell while the segment is out); uncontrolled otherwise.
export default function ThemeSwitch({
  choice,
  onChange,
  expanded,
  onExpandedChange,
}: {
  choice: ThemeChoice;
  onChange: (c: ThemeChoice) => void;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}) {
  const [internal, setInternal] = useState(false);
  const open = expanded ?? internal;
  function setOpen(v: boolean) {
    setInternal(v);
    onExpandedChange?.(v);
  }
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CurrentIcon = CHOICE_ICON[choice];
  const { t } = useLanguage();

  // Slide the indicator under the active option whenever it is visible.
  useLayoutEffect(() => {
    if (!open) return;
    const index = THEME_OPTIONS.findIndex((opt) => opt.value === choice);
    const el = buttonRefs.current[index];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [open, choice]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(c: ThemeChoice) {
    onChange(c);
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setOpen(false), COLLAPSE_DELAY_MS);
  }

  return (
    <div
      id="qz-theme"
      ref={rootRef}
      role="group"
      aria-label={t("theme.group")}
      // Relative: the sliding indicator is absolutely positioned and must
      // size against this shell — without it, it escapes to <main> and
      // renders as a full-height block.
      className="qz-material-bar relative flex h-9 items-center rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
    >
      {open ? (
        <>
          <span
            id="qz-theme-indicator"
            aria-hidden
            className="absolute top-1 bottom-1 rounded-[8px] bg-[var(--qz-primary)] transition-all duration-180 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {THEME_OPTIONS.map((opt, i) => (
            <button
              id={`qz-theme-opt-${opt.value}`}
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
          id="qz-theme-btn"
          type="button"
          aria-label={t("theme.change")}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qz-muted)] transition-colors duration-300 hover:text-[var(--qz-text)]"
        >
          <CurrentIcon size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
