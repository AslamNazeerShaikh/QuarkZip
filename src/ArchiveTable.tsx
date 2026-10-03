import {
  createColumnHelper,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRef, useState } from "react";
import type { ArchiveEntry } from "./App";
import { fileKind } from "./fileKind";
import { formatSize } from "./format";

const ROW_HEIGHT = 36;

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const columnHelper = createColumnHelper<typeof features, ArchiveEntry>();

const columns: Array<ColumnDef<typeof features, ArchiveEntry, any>> = [
  columnHelper.accessor("path", {
    header: "Name",
    sortFn: "alphanumeric",
    cell: (info) => {
      const kind = fileKind(info.row.original.path, info.row.original.size);
      const Icon = kind.icon;
      return (
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            size={16}
            aria-hidden
            className="shrink-0 text-[var(--qz-muted)]"
          />
          <span className="truncate leading-5">{info.getValue()}</span>
        </span>
      );
    },
  }),
  columnHelper.accessor(
    (row) => fileKind(row.path, row.size).label,
    {
      id: "type",
      header: "Type",
      sortFn: "alphanumeric",
      cell: (info) => info.getValue(),
    },
  ),
  columnHelper.accessor((row) => row.size ?? -1, {
    id: "size",
    header: "Size",
    sortFn: "basic",
    cell: (info) =>
      info.row.original.size === null
        ? "—"
        : formatSize(info.row.original.size as number),
  }),
  columnHelper.accessor("modified", {
    header: "Modified",
    sortFn: "alphanumeric",
    cell: (info) => info.getValue() ?? "—",
  }),
];

function SortIcon({ state }: { state: false | "asc" | "desc" }) {
  if (state === "asc") return <ArrowUp size={14} aria-hidden />;
  if (state === "desc") return <ArrowDown size={14} aria-hidden />;
  return <ArrowUpDown size={14} aria-hidden className="opacity-40" />;
}

interface Marquee {
  start: number;
  current: number;
}

/// Virtualized archive entry table (Name / Size / Modified) with clickable
/// sorting headers, checkbox + marquee-drag multi-select. Only visible rows
/// mount, so 10k-entry archives scroll smoothly.
export default function ArchiveTable({ data }: { data: ArchiveEntry[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(rows.map((r) => r.original.path)),
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
      rows.length - 1,
      Math.floor(Math.max(a, b) / ROW_HEIGHT),
    );
    setSelected(
      new Set(
        rows.slice(from, to + 1).map((r) => r.original.path),
      ),
    );
  }

  function beginMarquee(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button,input,a,th")) return;
    e.preventDefault();
    const y = contentY(e.clientY);
    setMarquee({ start: y, current: y });
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--qz-border)] bg-[var(--qz-surface)] text-[13px]">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="flex items-center">
              <th className="flex w-10 shrink-0 items-center justify-center px-2">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selected.size > 0 && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-[var(--qz-primary)]"
                />
              </th>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`flex h-9 cursor-pointer items-center gap-1 px-4 text-xs font-semibold tracking-wide text-[var(--qz-muted)] uppercase select-none ${header.column.id === "path" ? "min-w-0 flex-1" : header.column.id === "type" ? "w-24 shrink-0" : "w-28 shrink-0 justify-end"}`}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  <SortIcon state={header.column.getIsSorted()} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
      </table>
      <div
        ref={scrollRef}
        onMouseDown={beginMarquee}
        onMouseMove={(e) => {
          if (!marquee) return;
          const y = contentY(e.clientY);
          setMarquee({ ...marquee, current: y });
          selectRange(marquee.start, y);
        }}
        onMouseUp={() => setMarquee(null)}
        onMouseLeave={() => setMarquee(null)}
        className="scroll-slim max-h-96 overflow-auto"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          className="relative w-full"
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isSelected = selected.has(row.original.path);
            return (
              <div
                key={row.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center border-t border-[var(--qz-border)] ${
                  isSelected ? "bg-[var(--qz-primary)]/10" : ""
                }`}
              >
                <div className="flex w-10 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.original.path}`}
                    checked={isSelected}
                    onChange={() => toggleOne(row.original.path)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 accent-[var(--qz-primary)]"
                  />
                </div>
                {row.getAllCells().map((cell, i) => (
                  <div
                    key={cell.id}
                    className={`flex h-full items-center px-4 ${
                      i === 0 ? "min-w-0 flex-1" : "w-28 shrink-0 justify-end"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
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
        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-[var(--qz-muted)]">
            No entries
          </p>
        )}
      </div>
    </div>
  );
}
