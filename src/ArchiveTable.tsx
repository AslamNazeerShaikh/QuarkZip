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
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Folder } from "lucide-react";
import { useRef, useState } from "react";
import type { ArchiveEntry } from "./App";
import { formatSize } from "./format";

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
      const entry = info.row.original;
      const isFolder = entry.size === null || entry.size === 0;
      const Icon = isFolder ? Folder : FileText;
      return (
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            size={16}
            aria-hidden
            className="shrink-0 text-[var(--qz-muted)]"
          />
          <span className="truncate">{info.getValue()}</span>
        </span>
      );
    },
  }),
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
  return (
    <ArrowUpDown
      size={14}
      aria-hidden
      className="opacity-40"
    />
  );
}

/// Virtualized archive entry table (Name / Size / Modified) with clickable
/// sorting headers. Only visible rows mount, so 10k-entry archives scroll
/// smoothly.
export default function ArchiveTable({ data }: { data: ArchiveEntry[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
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
    estimateSize: () => 33,
    overscan: 10,
  });

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--qz-border)] bg-[var(--qz-surface)]">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header, i) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`flex cursor-pointer items-center gap-1 px-4 py-2 text-xs font-semibold tracking-wide text-[var(--qz-muted)] uppercase select-none ${
                    i === 0 ? "min-w-0 flex-1" : "w-28 shrink-0 justify-end"
                  }`}
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
      <div ref={scrollRef} className="max-h-96 overflow-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          className="relative w-full"
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center border-t border-[var(--qz-border)]"
              >
                {row.getAllCells().map((cell, i) => (
                  <div
                    key={cell.id}
                    className={`px-4 py-1.5 ${
                      i === 0 ? "min-w-0 flex-1" : "w-28 shrink-0 text-right"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-[var(--qz-muted)]">
            No entries
          </p>
        )}
      </div>
    </div>
  );
}
