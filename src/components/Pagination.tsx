import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCount } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";

export const PAGE_SIZES = [100, 1000, 5000, 10000] as const;
export type PageSize = (typeof PAGE_SIZES)[number] | "all";

const ALL_OPTIONS: PageSize[] = [...PAGE_SIZES, "all"];
/// "Show all" renders through the windowed table, whose spacer div is
/// `rows × 36px` tall — past ~3.6M px (100k rows) engines clamp element
/// height and rows misplace/clip. Above the cap the option hides and an
/// active "all" coerces back to the largest page.
export const ALL_PAGE_CAP = 100_000;

function formatSize(size: PageSize, allLabel: string): string {
  return size === "all" ? allLabel : formatCount(size);
}

/// Floating pagination controls: per-page selector, prev/next, page readout.
/// Material shell matching the other footer controls.
///
/// The page-size menu is a custom listbox (not a native `<select>`): native
/// option popups are painted by the OS and ignore the app theme.
function PageSizeMenu({
  pageSize,
  options,
  onPageSize,
}: {
  pageSize: PageSize;
  options: PageSize[];
  onPageSize: (s: PageSize) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => options.indexOf(pageSize));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();
  const allLabel = t("pagination.all");

  // Closes on outside click or Escape — same pattern as ThemeSwitch.
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

  function choose(size: PageSize) {
    onPageSize(size);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActive(options.indexOf(pageSize));
      setOpen(true);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(options[active]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("pagination.rowsPerPage")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActive(options.indexOf(pageSize));
          setOpen((o) => !o);
        }}
        onKeyDown={onButtonKey}
        className="flex h-7 cursor-pointer items-center gap-1 rounded-[7px] px-2 text-[var(--qz-muted)] tabular-nums outline-none hover:text-[var(--qz-text)]"
      >
        {formatSize(pageSize, allLabel)}
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("pagination.rowsPerPage")}
          onKeyDown={onListKey}
          className="qz-material-bar animate-qz-pop absolute bottom-full left-0 mb-2 w-max min-w-full rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
        >
          {options.map((size, i) => {
            const selected = size === pageSize;
            return (
              <button
                key={size}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(size)}
                onMouseEnter={() => setActive(i)}
                className={`flex h-8 w-full items-center justify-between gap-4 rounded-[7px] px-2 tabular-nums transition-colors ${
                  i === active
                    ? "bg-[var(--qz-primary-soft)] text-[var(--qz-text)]"
                    : "text-[var(--qz-muted)]"
                } ${selected ? "font-semibold text-[var(--qz-primary)]" : ""}`}
              >
                {formatSize(size, allLabel)}
                {selected && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/// Floating pagination controls: per-page selector, prev/next, page readout.
/// Material shell matching the other footer controls.
export default function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
}) {
  const { t } = useLanguage();
  const allowAll = total <= ALL_PAGE_CAP;
  const options: PageSize[] = allowAll ? ALL_OPTIONS : [...PAGE_SIZES];
  // A bigger archive opened while "all" was active: coerce before the
  // spacer can overflow the engine's element-height limit.
  useEffect(() => {
    if (!allowAll && pageSize === "all") onPageSize(10000);
  }, [allowAll, pageSize, onPageSize]);
  return (
    <div className="qz-material-bar flex h-9 items-center gap-1 rounded-[10px] border border-[var(--qz-border)] px-1 shadow-[var(--qz-shadow-card)]">
      <PageSizeMenu
        pageSize={pageSize === "all" && !allowAll ? 10000 : pageSize}
        options={options}
        onPageSize={onPageSize}
      />
      <button
        type="button"
        aria-label={t("pagination.prevPage")}
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="rounded-[7px] p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <span className="min-w-16 text-center text-[var(--qz-muted)] tabular-nums">
        {pageCount === 0
          ? `0 / 0`
          : `${formatCount(page + 1)} / ${formatCount(pageCount)}`}
      </span>
      <button
        type="button"
        aria-label={t("pagination.nextPage")}
        disabled={pageCount === 0 || page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
        className="rounded-[7px] p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronRight size={16} aria-hidden />
      </button>
      <span className="hidden pr-2 text-[var(--qz-muted)] tabular-nums min-[1100px]:inline">
        {formatCount(total)}
      </span>
    </div>
  );
}
