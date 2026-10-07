import { Check, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOCALES } from "../i18n/locales";
import { useLanguage } from "../i18n/LanguageContext";

/// Footer language menu: shell-styled like its Pagination/ThemeSwitch
/// neighbours (h-9, 10px radius, 1px border, card shadow) with a floating
/// listbox above it — same pattern as the page-size menu. Lists every
/// locale from the registry by native name; switching persists to
/// localStorage and re-renders instantly (no restart).
export default function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeNative = LOCALES.find((l) => l.code === lang)?.native ?? lang;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(code: string) {
    setLang(code);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={t("lang.language")}
      className="qz-material-bar relative flex h-9 shrink-0 items-center rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("lang.changeLanguage")}
        title={activeNative}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[8px] text-[var(--qz-muted)] outline-none transition-colors hover:text-[var(--qz-text)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
      >
        <Languages size={18} aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("lang.language")}
          // Left-anchored: the control rides the overview card's action row
          // (middle or extreme left), never the window edge — a right-anchored
          // menu would spill past the card's left side.
          className="qz-material-bar animate-qz-pop absolute bottom-full left-0 mb-2 w-max min-w-full rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
        >
          {LOCALES.map((locale) => {
            const selected = locale.code === lang;
            return (
              <button
                key={locale.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(locale.code)}
                className={`flex h-8 w-full items-center justify-between gap-4 rounded-[7px] px-2 text-[13px] transition-colors ${
                  selected
                    ? "bg-[var(--qz-primary-soft)] font-semibold text-[var(--qz-primary)]"
                    : "text-[var(--qz-muted)] hover:text-[var(--qz-text)]"
                }`}
              >
                {locale.native}
                {selected && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
