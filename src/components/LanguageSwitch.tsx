import { Check, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES } from "../i18n/locales";
import { useLanguage } from "../i18n/LanguageContext";
import { menuAbove, menuBelow, usePortaledMenu } from "./usePortaledMenu";

/// Footer language menu: shell-styled like its Pagination/ThemeSwitch
/// neighbours (h-9, 10px radius, 1px border, card shadow) with a floating
/// listbox above it — same pattern as the page-size menu. Lists every
/// locale from the registry by native name; switching persists to
/// localStorage and re-renders instantly (no restart).
///
/// The listbox portals to `document.body`: on the short collapsed card an
/// in-card upward menu is taller than the card itself and `overflow-hidden`
/// clips it. While the card is collapsed (`below`) the menu drops under
/// the trigger instead — the table below has the room.
export default function LanguageSwitch({ below = false }: { below?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { menuRef, rect } = usePortaledMenu(open, rootRef);
  const activeNative = LOCALES.find((l) => l.code === lang)?.native ?? lang;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // The portal lives outside the shell: option presses must not read
      // as "outside" (they would unmount the menu before click fires).
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
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
      id="qz-lang"
      ref={rootRef}
      role="group"
      aria-label={t("lang.language")}
      className="qz-material-bar relative flex h-9 shrink-0 items-center rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
    >
      <button
        id="qz-lang-btn"
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
        className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qz-muted)] outline-none transition-all duration-150 hover:text-[var(--qz-text)] motion-safe:active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
      >
        <Languages size={18} aria-hidden />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            id="qz-lang-menu"
            ref={menuRef}
            role="listbox"
            aria-label={t("lang.language")}
            // Left-aligned to the shell, 8px beside it, viewport-anchored
            // (see hook): never clipped by the card, never past its left.
            style={below ? menuBelow(rect) : menuAbove(rect)}
            className="qz-material-bar animate-qz-pop z-50 w-max rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
          >
            {LOCALES.map((locale) => {
              const selected = locale.code === lang;
              return (
                <button
                  id={`qz-lang-opt-${locale.code}`}
                  key={locale.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={locale.native}
                  onClick={() => choose(locale.code)}
                  className={`flex h-8 w-full items-center justify-between gap-4 rounded-[7px] px-2 text-[13px] transition-all duration-150 motion-safe:active:scale-[0.98] ${
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
          </div>,
          document.body,
        )}
    </div>
  );
}
