import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "./App";
import { fileKind } from "./fileKind";
import { formatSize } from "./format";

export const ROW_HEIGHT = 36;
const OVERSCAN = 10;

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
    value: (r) => fileKind(r.path, r.size).label,
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
    width: "w-28",
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

interface Marquee {
  start: number;
  current: number;
}

/// Hand-rolled archive table: sortable columns, windowed rows (only visible
/// rows mount, so 10k-entry archives scroll smoothly), checkbox + marquee
/// multi-select. No table library — plain divs over the sorted data.
export default function ArchiveTable({ data }: { data: ArchiveEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const column = COLUMNS.find((c) => c.key === sortKey);
    if (!column) return data;
    const ordered = [...data].sort((a, b) =>
      compareValues(column.value(a), column.value(b)),
    );
    return sortDir === "asc" ? ordered : ordered.reverse();
  }, [data, sortKey, sortDir]);

  // Visible window with overscan; jsdom reports no layout (clientHeight 0),
  // in which case render everything so tests and snapshots see full content.
  const viewportHeight = scrollRef.current?.clientHeight || 0;
  const visibleCount =
    viewportHeight === 0
      ? sorted.length
      : Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN,
  );
  const visible = sorted.slice(startIndex, startIndex + visibleCount);

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(sorted.map((r) => r.path)),
    );
  }

  function toggleOne(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  /// Content-relative Y for marquee math (scroll offset included).
  function contentY(clientY: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    return clientY - el.getBoundingClientRect().top + el.scrollTop;
  }

  function selectRange(a: number, b: number) {
    const from = Math.max(0, Math.floor(Math.min(a, b) / ROW_HEIGHT));
    const to = Math.min(
      sorted.length - 1,
      Math.floor(Math.max(a, b) / ROW_HEIGHT),
    );
    setSelected(new Set(sorted.slice(from, to + 1).map((r) => r.path)));
  }

  function beginMarquee(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button,input,a,th")) return;
    e.preventDefault();
    const y = contentY(e.clientY);
    setMarquee({ start: y, current: y });
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-[var(--qz-border)] bg-[var(--qz-surface)] text-[13px]">
      <div className="flex h-9 items-center">
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
            className={`flex h-full cursor-pointer items-center gap-1 px-4 text-xs font-semibold tracking-wide text-[var(--qz-muted)] uppercase select-none ${
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
        onMouseDown={beginMarquee}
        onMouseMove={(e) => {
          if (!marquee) return;
          const y = contentY(e.clientY);
          setMarquee({ ...marquee, current: y });
          selectRange(marquee.start, y);
        }}
        onMouseUp={() => setMarquee(null)}
        onMouseLeave={() => setMarquee(null)}
        className="scroll-slim min-h-0 flex-1 overflow-auto"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          style={{ height: `${sorted.length * ROW_HEIGHT}px` }}
          className="relative w-full"
        >
          {visible.map((entry, offset) => {
            const index = startIndex + offset;
            const kind = fileKind(entry.path, entry.size);
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
                <div className="flex h-full w-28 shrink-0 items-center justify-end px-4">
                  {entry.size === null ? "—" : formatSize(entry.size)}
                </div>
                <div className="flex h-full w-28 shrink-0 items-center justify-end px-4 text-[var(--qz-muted)]">
                  {entry.modified ?? "—"}
                </div>
              </div>
            );
          })}
          {marquee && (
            <div
              aria-hidden
              className="absolute right-0 left-0 rounded border border-[var(--qz-primary)] bg-[var(--qz-primary)]/10"
              style={{
                top: Math.min(marquee.start, marquee.current),
                height: Math.abs(marquee.current - marquee.start),
              }}
            />
          )}
        </div>
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-[var(--qz-muted)]">
            No entries
          </p>
        )}
      </div>
    </div>
  );
}
