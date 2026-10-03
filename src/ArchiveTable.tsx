import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "./App";
import { fileKind } from "./fileKind";
import { formatSize } from "./format";

export const ROW_HEIGHT = 36;
const OVERSCAN = 10;
const MIN_THUMB = 24;

type SortKey = "path" | "size" | "type" | "modified";
type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  header: string;
  width: string;
  align: "left" | "right";
  value: (row: ArchiveEntry) => string | number;
}

const COLUMNS: Column[] = [
  { key: "path", header: "Name", width: "flex-1", align: "left", value: (r) => r.path },
  {
    key: "type",
    header: "Type",
    width: "w-24",
    align: "left",
    value: (r) => fileKind(r.path, r.is_folder).label,
  },
  {
    key: "size",
    header: "Size",
    width: "w-28",
    align: "right",
    value: (r) => r.size ?? -1,
  },
  {
    key: "modified",
    header: "Modified",
    width: "w-44",
    align: "right",
    value: (r) => r.modified ?? "",
  },
];

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function SortIcon({ state }: { state: SortDir | null }) {
  if (state === "asc") return <ArrowUp size={14} aria-hidden />;
  if (state === "desc") return <ArrowDown size={14} aria-hidden />;
  return <ArrowUpDown size={14} aria-hidden className="opacity-40" />;
}

/// Hand-rolled archive table: sortable columns, windowed rows (only visible
/// rows mount, so 10k-entry archives scroll smoothly), checkbox
/// multi-select, and a floating scrollbar outside the table edge. No table
/// library — plain divs over the sorted data.
///
/// Pagination is controlled by the parent: `page`/`pageSize` select a slice
/// of the sorted rows; selection is global across pages.
export default function ArchiveTable({
  data,
  page,
  pageSize,
}: {
  data: ArchiveEntry[];
  page: number;
  pageSize: number | "all";
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [trackH, setTrackH] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const column = COLUMNS.find((c) => c.key === sortKey);
    if (!column) return data;
    const ordered = [...data].sort((a, b) =>
      compareValues(column.value(a), column.value(b)),
    );
    return sortDir === "asc" ? ordered : ordered.reverse();
  }, [data, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    if (pageSize === "all") return sorted;
    return sorted.slice(page * pageSize, (page + 1) * pageSize);
  }, [sorted, page, pageSize]);

  // Reset scroll whenever the visible slice changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [page, pageSize, data]);

  // Visible window with overscan; jsdom reports no layout (clientHeight 0),
  // in which case render everything so tests and snapshots see full content.
  const viewportHeight = scrollRef.current?.clientHeight || 0;
  const visibleCount =
    viewportHeight === 0
      ? pageRows.length
      : Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN,
  );
  const visible = pageRows.slice(startIndex, startIndex + visibleCount);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    if (!scrollEl || !trackEl) return;
    const update = () => {
      setViewportH(scrollEl.clientHeight);
      setTrackH(trackEl.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    ro.observe(trackEl);
    return () => ro.disconnect();
  }, []);

  const totalH = pageRows.length * ROW_HEIGHT;
  const showScrollbar = trackH > 0 && totalH > viewportH;
  const thumbH = showScrollbar
    ? Math.max(MIN_THUMB, (viewportH / totalH) * trackH)
    : 0;
  const thumbTop = showScrollbar
    ? (scrollTop / (totalH - viewportH)) * (trackH - thumbH)
    : 0;

  function scrollTo(y: number) {
    const el = scrollRef.current;
    if (!el) return;
    const top = Math.max(0, Math.min(y, totalH - viewportH));
    if (typeof el.scrollTo === "function") el.scrollTo({ top });
    else el.scrollTop = top;
  }

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.path));

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const r of pageRows) next.delete(r.path);
      } else {
        for (const r of pageRows) next.add(r.path);
      }
      return next;
    });
  }

  function toggleOne(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="group/table relative min-h-0 w-full min-w-0 flex-1">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-[var(--qz-border)] bg-[var(--qz-surface)] text-[13px]">
        <div className="flex h-9 shrink-0 items-center">
          <div className="flex w-10 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selected.size > 0 && !allSelected;
              }}
              onChange={toggleAll}
              className="h-3.5 w-3.5 accent-[var(--qz-primary)]"
            />
          </div>
          {COLUMNS.map((column) => (
            <button
              key={column.key}
              type="button"
              onClick={() => toggleSort(column.key)}
              className={`flex h-full cursor-pointer items-center gap-1 px-4 font-semibold tracking-wide text-[var(--qz-muted)] uppercase select-none ${
                column.key === "path"
                  ? "min-w-0 flex-1"
                  : `${column.width} shrink-0 ${column.align === "right" ? "justify-end" : ""}`
              }`}
            >
              {column.header}
              <SortIcon state={sortKey === column.key ? sortDir : null} />
            </button>
          ))}
        </div>
        <div
          ref={scrollRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="scroll-hidden min-h-0 flex-1 overflow-y-auto pb-16"
        >
          <div
            style={{ height: `${totalH}px` }}
            className="relative w-full"
          >
            {visible.map((entry, offset) => {
              const index = startIndex + offset;
              const kind = fileKind(entry.path, entry.is_folder);
              const Icon = kind.icon;
              const isSelected = selected.has(entry.path);
              return (
                <div
                  key={entry.path}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${ROW_HEIGHT}px`,
                    transform: `translateY(${index * ROW_HEIGHT}px)`,
                  }}
                  className={`flex items-center border-t border-[var(--qz-border)] ${
                    isSelected ? "bg-[var(--qz-primary)]/10" : ""
                  }`}
                >
                  <div className="flex w-10 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.path}`}
                      checked={isSelected}
                      onChange={() => toggleOne(entry.path)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 accent-[var(--qz-primary)]"
                    />
                  </div>
                  <div className="flex h-full min-w-0 flex-1 items-center px-4">
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        size={16}
                        aria-hidden
                        className="shrink-0 text-[var(--qz-muted)]"
                      />
                      <span className="truncate leading-5">{entry.path}</span>
                    </span>
                  </div>
                  <div className="flex h-full w-24 shrink-0 items-center px-4 text-[var(--qz-muted)]">
                    {kind.label}
                  </div>
                  <div className="flex h-full w-28 shrink-0 items-center justify-end overflow-hidden px-4">
                    {entry.size === null ? "—" : formatSize(entry.size)}
                  </div>
                  <div className="flex h-full w-44 shrink-0 items-center justify-end overflow-hidden px-4 text-[var(--qz-muted)]">
                    <span className="truncate whitespace-nowrap">{entry.modified ?? "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {pageRows.length === 0 && (
            <p className="px-4 py-6 text-center text-[var(--qz-muted)]">
              No entries
            </p>
          )}
        </div>
      </div>
      {showScrollbar && (
        <div
          ref={trackRef}
          role="scrollbar"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={totalH - viewportH}
          aria-valuenow={Math.round(scrollTop)}
          onMouseDown={(e) => {
            // Jump on track click; thumb drags via its own handlers.
            if (e.target !== e.currentTarget || e.button !== 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            scrollTo(ratio * totalH - viewportH / 2);
          }}
          className="absolute top-10 -right-3.5 bottom-1 w-2.5 cursor-pointer group/track"
        >
          <div
            role="presentation"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              dragRef.current = {
                startY: e.clientY,
                startScroll: scrollTop,
              };
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current;
              if (!drag) return;
              const ratio =
                (e.clientY - drag.startY) / (trackH - thumbH);
              scrollTo(drag.startScroll + ratio * (totalH - viewportH));
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            className="absolute right-0 left-0 rounded-full bg-[var(--qz-muted)] opacity-0 transition-opacity duration-300 group-hover/table:opacity-60 group-hover/track:opacity-60 hover:opacity-100"
            style={{ top: thumbTop, height: thumbH }}
          />
        </div>
      )}
    </div>
  );
}
