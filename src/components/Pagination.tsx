import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCount } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";
import { menuAbove, usePortaledMenu } from "./usePortaledMenu";
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

/// Jump-to-page field merged with the readout: `[<input>] / <total>`.
/// Type a number, Enter jumps; only clean in-range numbers jump silently
/// (see below). The input sizes to the page count so it never wastes
/// shell width. Single pages show a static `1 / 1` (nothing to jump to),
/// empty listings `0 / 0`. Same h-7 inner shell as the size trigger so
/// the row stays one height.
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
  // Width fits the page count (8px per tabular digit + padding, 40px
  // floor) — the shell never pays for digits it doesn't have.
  const inputWidth = Math.max(40, String(pageCount).length * 8 + 16);
  function revert() {
    setText(String(page + 1));
  }
  function jumpTo(n: number) {
    if (n - 1 !== page) onPage(n - 1);
    revert();
  }
  function commit() {
    // Only a clean in-range number jumps silently. Everything else —
    // out-of-range, trailing garbage ("66abc"), pure garbage, empty —
    // confirms first; Jump lands on the read-off page (leading digits,
    // clamped) and Cancel reverts.
    const trimmed = text.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number.parseInt(trimmed, 10);
      if (n >= 1 && n <= pageCount) {
        jumpTo(n);
        return;
      }
    }
    const head = trimmed.match(/^\d+/);
    const target = head
      ? Math.min(Math.max(Number.parseInt(head[0], 10), 1), pageCount)
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
      <span
        id="qz-pager-jump"
        className="flex items-center text-[var(--qz-muted)] tabular-nums"
      >
        <input
          id="qz-pager-jump-input"
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
          style={{ width: inputWidth }}
          className="h-7 rounded-[7px] bg-transparent px-1 text-center text-[var(--qz-muted)] tabular-nums outline-none hover:text-[var(--qz-text)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
        />
        <span id="qz-pager-jump-total" className="pr-1 whitespace-nowrap">
          / {formatCount(pageCount)}
        </span>
      </span>
      {pending &&
        // Portaled to <body>: every material ancestor (`backdrop-filter`)
        // traps `fixed` positioning, which would squeeze this window-modal
        // into the footer shell instead of centering it like About.
        createPortal(
          <div
            id="qz-pager-jump-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-jump-title"
          >
            <div
              id="qz-pager-jump-backdrop"
              className="animate-qz-fade absolute inset-0 bg-black/25"
              aria-hidden
            />
            <div
              id="qz-pager-jump-card"
              className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
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
              <div
                id="qz-pager-jump-actions"
                className="mt-5 flex items-center justify-center gap-2"
              >
                <Button
                  id="qz-pager-jump-cancel"
                  variant="warning"
                  onClick={cancelJump}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  id="qz-pager-jump-confirm"
                  variant="accent"
                  onClick={confirmJump}
                  autoFocus
                >
                  {t("pagination.jump")}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
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
  const { menuRef, rect } = usePortaledMenu(open, rootRef);
  const { t } = useLanguage();
  const allLabel = t("pagination.all");

  // Closes on outside click or Escape — same pattern as ThemeSwitch.
  // The portal lives outside the trigger: menu presses must not read as
  // "outside" (they would unmount the menu before click fires).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
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
    <div id="qz-pager-size" ref={rootRef} className="relative">
      <button
        id="qz-pager-size-btn"
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
      {open &&
        rect &&
        createPortal(
          <div
            id="qz-pager-size-menu"
            ref={menuRef}
            role="listbox"
            aria-label={t("pagination.rowsPerPage")}
            onKeyDown={onListKey}
            // Viewport-anchored above the trigger (see hook): never
            // clipped by the card, options hug the trigger's left edge.
            style={menuAbove(rect)}
            className="qz-material-bar animate-qz-pop z-50 w-max rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
          >
            {options.map((size, i) => {
              const selected = size === pageSize;
              return (
                <button
                  id={`qz-pager-size-opt-${size}`}
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
          </div>,
          document.body,
        )}
    </div>
  );
}

/// Readout for un-jumpable states: `0 / 0` when empty, static `1 / 1`
/// on a single page (no input — nothing to jump to). Anything pageable
/// renders the combined jump+readout instead.
function PageJumpOrReadout({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount > 1)
    return <PageJump page={page} pageCount={pageCount} onPage={onPage} />;
  return (
    <span
      id="qz-pager-readout"
      className="min-w-16 text-center text-[var(--qz-muted)] tabular-nums"
    >
      {pageCount === 0 ? `0 / 0` : `1 / 1`}
    </span>
  );
}

/// Floating pagination controls: per-page selector, prev/next, page readout.
/// Material shell matching the other footer controls.
///
/// While the theme segment is out (`compact`), the shell shrinks to one
/// icon button — the row would otherwise overflow at 800px — and returns
/// to full width the moment the segment minimizes. The icon names the
/// current page and re-expands on click (by closing the theme segment).
export default function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
  compact = false,
  onExpand,
}: {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
  compact?: boolean;
  onExpand?: () => void;
}) {
  const { t } = useLanguage();
  if (compact) {
    const label =
      pageCount === 0
        ? t("pagination.expand")
        : `${t("pagination.expand")} — ${formatCount(page + 1)} / ${formatCount(pageCount)}`;
    return (
      <div
        id="qz-pager-compact"
        className="qz-material-bar flex h-9 shrink-0 items-center rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
      >
        <button
          id="qz-pager-compact-btn"
          type="button"
          aria-label={label}
          title={label}
          onClick={onExpand}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qz-muted)] transition-colors outline-none hover:text-[var(--qz-text)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
        >
          <ListOrdered size={18} aria-hidden />
        </button>
      </div>
    );
  }
  const allowAll = total <= ALL_PAGE_CAP;
  const options: PageSize[] = allowAll ? ALL_OPTIONS : [...PAGE_SIZES];
  // A bigger archive opened while "all" was active: coerce before the
  // spacer can overflow the engine's element-height limit.
  useEffect(() => {
    if (!allowAll && pageSize === "all") onPageSize(10000);
  }, [allowAll, pageSize, onPageSize]);
  return (
    <div
      id="qz-pager"
      className="qz-material-bar flex h-9 items-center gap-1 rounded-[10px] border border-[var(--qz-border)] px-1 shadow-[var(--qz-shadow-card)]"
    >
      <PageSizeMenu
        pageSize={pageSize === "all" && !allowAll ? 10000 : pageSize}
        options={options}
        onPageSize={onPageSize}
      />
      <button
        id="qz-pager-prev"
        type="button"
        aria-label={t("pagination.prevPage")}
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="rounded-[7px] p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <PageJumpOrReadout page={page} pageCount={pageCount} onPage={onPage} />
      <button
        id="qz-pager-next"
        type="button"
        aria-label={t("pagination.nextPage")}
        disabled={pageCount === 0 || page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
        className="rounded-[7px] p-1.5 text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-30"
      >
        <ChevronRight size={16} aria-hidden />
      </button>
      <span
        id="qz-pager-total"
        className="hidden pr-2 text-[var(--qz-muted)] tabular-nums min-[1100px]:inline"
      >
        {formatCount(total)}
      </span>
    </div>
  );
}
