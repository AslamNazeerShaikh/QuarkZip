import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCount } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "./ui/button";

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

/// Jump-to-page field: type a number, Enter jumps (clamped 1..pageCount),
/// Escape/blur reverts without navigating. Hidden on single pages. Same
/// h-7 inner shell as the size trigger so the row stays one height.
///
/// Out-of-range or non-numeric input does NOT jump directly: a confirm
/// popup names the valid range and offers Jump (same clamp logic) or
/// Cancel (revert to the current page) — direct jumps stay silent only
/// for clean in-range numbers.
function PageJump({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  const { t } = useLanguage();
  const [text, setText] = useState(String(page + 1));
  // Wrong input awaiting confirmation: raw text plus its clamped target.
  const [pending, setPending] = useState<{
    raw: string;
    target: number;
  } | null>(null);
  useEffect(() => {
    setText(String(page + 1));
  }, [page]);
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape cancels the whole attempt: popup closes, field reverts.
      if (e.key === "Escape") cancelJump();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending]);
  if (pageCount <= 1) return null;
  function revert() {
    setText(String(page + 1));
  }
  function jumpTo(n: number) {
    if (n - 1 !== page) onPage(n - 1);
    revert();
  }
  function commit() {
    const trimmed = text.trim();
    const n = /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= pageCount) {
      jumpTo(n);
      return;
    }
    // Weird input: confirm, showing where Jump would land (same clamp).
    const target = Number.isInteger(n)
      ? Math.min(Math.max(n, 1), pageCount)
      : 1;
    setPending({ raw: text, target });
  }
  function confirmJump() {
    if (!pending) return;
    setPending(null);
    jumpTo(pending.target);
  }
  function cancelJump() {
    setPending(null);
    revert();
  }
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={t("pagination.goToPage")}
        aria-valuemin={1}
        aria-valuemax={pageCount}
        aria-valuenow={page + 1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            revert();
            e.currentTarget.blur();
          }
        }}
        onBlur={revert}
        className="h-7 w-14 rounded-[7px] bg-transparent px-1 text-center text-[var(--qz-muted)] tabular-nums outline-none hover:text-[var(--qz-text)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
      />
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-jump-title"
        >
          <div
            className="animate-qz-fade absolute inset-0 bg-black/25"
            aria-hidden
          />
          <div className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-warning-soft)]">
              <TriangleAlert
                size={24}
                aria-hidden
                className="text-[var(--qz-warning)]"
              />
            </span>
            <h2
              id="page-jump-title"
              className="mt-3 text-[16px] leading-6 font-semibold"
            >
              {t("pagination.jumpTitle")}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
              {t("pagination.jumpMessage", {
                raw: pending.raw,
                target: String(pending.target),
                max: String(pageCount),
              })}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button variant="warning" onClick={cancelJump}>
                {t("common.cancel")}
              </Button>
              <Button variant="accent" onClick={confirmJump} autoFocus>
                {t("pagination.jump")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
      <PageJump page={page} pageCount={pageCount} onPage={onPage} />
      <span className="hidden pr-2 text-[var(--qz-muted)] tabular-nums min-[1100px]:inline">
        {formatCount(total)}
      </span>
    </div>
  );
}
