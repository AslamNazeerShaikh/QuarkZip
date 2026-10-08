import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Minus,
  PackageOpen,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ArchiveEntry } from "../App";
import { fileKind } from "../lib/fileKind";
import { formatModified, formatSize } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";

export const ROW_HEIGHT = 36;
const OVERSCAN = 10;

export type SortKey = "path" | "size" | "type" | "modified";
export type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  headerKey: string;
  width: string;
  align: "left" | "center";
}

function baseColumns(): Column[] {
  return [
    {
      key: "path",
      headerKey: "table.colName",
      width: "flex-1",
      align: "left",
    },
    {
      key: "type",
      headerKey: "table.colType",
      width: "w-24",
      align: "center",
    },
    {
      key: "size",
      headerKey: "table.colSize",
      width: "w-32",
      align: "center",
    },
    {
      key: "modified",
      headerKey: "table.colModified",
      width: "w-64",
      align: "center",
    },
  ];
}

function SortIcon({ state }: { state: SortDir | null }) {
  if (state === "asc") return <ArrowUp size={14} aria-hidden />;
  if (state === "desc") return <ArrowDown size={14} aria-hidden />;
  return <ArrowUpDown size={14} aria-hidden className="opacity-40" />;
}

/// Theme-painted checkbox (button + `role="checkbox"`). The native input is
/// OS-painted: on Linux WebKitGTK it ignores `accent-color` and the check
/// glyph renders clipped/missing at small sizes — so the box, check, and
/// indeterminate dash are all drawn from `--qz-*` tokens instead.
function TableCheckbox({
  label,
  checked,
  onToggle,
  id,
}: {
  label: string;
  checked: boolean | "mixed";
  onToggle: () => void;
  id?: string;
}) {
  const on = checked !== false;
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qz-primary)] ${
        on
          ? "border-transparent bg-[var(--qz-primary)]"
          : "border-[var(--qz-border)] bg-transparent hover:border-[var(--qz-primary)]"
      }`}
    >
      {checked === "mixed" ? (
        <Minus
          size={12}
          strokeWidth={3}
          aria-hidden
          className="text-[var(--qz-on-primary)]"
        />
      ) : (
        checked && (
          <Check
            size={12}
            strokeWidth={3}
            aria-hidden
            className="text-[var(--qz-on-primary)]"
          />
        )
      )}
    </button>
  );
}

/// Hand-rolled archive table: sortable columns, windowed rows (only visible
/// rows mount, so 10k-entry archives scroll smoothly), checkbox
/// multi-select, and a native slim scrollbar. No table library — plain divs
/// over the served page.
///
/// P2: sorting and paging are server-side — `data` is exactly the current
/// page, `onSortKey` asks the backend to re-sort (header state comes back
/// down as props), and selection resets per open archive (`listingId`),
/// never per page turn, so it survives paging.
/// Pagination is controlled by the parent: `page`/`pageSize` select a slice
/// of the sorted rows; selection is global across pages. Selection belongs
/// to one listing: a new `data` identity clears it, and every change is
/// reported via `onSelectionChange` (used for selection-aware extraction).
export default function ArchiveTable({
  data,
  page,
  pageSize,
  sortKey,
  sortDir,
  onSortKey,
  listingId,
  busy = false,
  onSelectionChange,
}: {
  data: ArchiveEntry[];
  page: number;
  pageSize: number | "all";
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSortKey: (key: SortKey) => void;
  /// Open archive path: selection resets when it changes (page turns keep
  /// accumulating into the same set).
  listingId: string | null;
  /// A page fetch in flight: rows dim, sort headers hold still.
  busy?: boolean;
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ref-held so the reset effect below only fires on `data` identity,
  // never on a re-created callback.
  const selectionCb = useRef(onSelectionChange);
  selectionCb.current = onSelectionChange;

  const { t } = useLanguage();
  const folderLabel = t("filekind.folder");
  const fileLabel = t("filekind.file");
  const columns = baseColumns();

  // `data` is already the served page in server order: no client sort,
  // just the visible window over it.
  const pageRows = data;

  // Reset scroll whenever the visible slice changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [page, pageSize, data]);

  // A new listing is a new archive: drop stale selections. Page turns
  // keep accumulating into the same set (it survives paging by design).
  const listingRef = useRef(listingId);
  useEffect(() => {
    if (listingRef.current !== listingId) {
      listingRef.current = listingId;
      const empty = new Set<string>();
      setSelected(empty);
      selectionCb.current?.(empty);
    }
  }, [listingId]);

  // Visible window with overscan; jsdom reports no layout (clientHeight 0),
  // in which case render everything so tests and snapshots see full content.
  const viewportHeight = scrollRef.current?.clientHeight || 0;
  const visibleCount =
    viewportHeight === 0
      ? pageRows.length
      : Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visible = pageRows.slice(startIndex, startIndex + visibleCount);

  const totalH = pageRows.length * ROW_HEIGHT;
  // 1-based serial across the whole sorted dataset, stable under paging.
  const rowBase = pageSize === "all" ? 0 : page * (pageSize as number);

  const allSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.path));

  function toggleSort(key: SortKey) {
    onSortKey(key);
  }

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) {
      for (const r of pageRows) next.delete(r.path);
    } else {
      for (const r of pageRows) next.add(r.path);
    }
    setSelected(next);
    selectionCb.current?.(next);
  }

  function toggleOne(path: string) {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
    selectionCb.current?.(next);
  }

  return (
    <div
      id="qz-table-root"
      aria-busy={busy}
      className={`relative min-h-0 w-full min-w-0 flex-1 transition-opacity ${busy ? "opacity-60" : ""}`}
    >
      <div
        id="qz-table-card"
        className="qz-material-bar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[13px] border border-[var(--qz-border)] text-[13px]"
      >
        {/* Header matches ROW_HEIGHT so it never reads slim next to rows.
            Translucent: rows scroll underneath like a native list header. */}
        <div
          id="qz-table-header"
          className="qz-material-bar flex shrink-0 items-center"
          style={{ height: ROW_HEIGHT }}
        >
          <div
            id="qz-table-header-select"
            className="flex w-10 shrink-0 items-center justify-center"
          >
            <TableCheckbox
              id="qz-table-select-all"
              label={t("table.selectAll")}
              checked={allSelected ? true : selected.size > 0 ? "mixed" : false}
              onToggle={toggleAll}
            />
          </div>
          <div
            id="qz-table-header-index"
            aria-hidden
            className="flex h-full w-12 shrink-0 items-center justify-center px-2 text-xs font-semibold tracking-wide text-[var(--qz-faint)] uppercase select-none"
          >
            #
          </div>
          {columns.map((column) => (
            <button
              id={`qz-table-sort-${column.key}`}
              key={column.key}
              type="button"
              onClick={() => toggleSort(column.key)}
              disabled={busy}
              className={`flex h-full cursor-pointer items-center gap-1 px-4 text-xs font-semibold tracking-wide text-[var(--qz-faint)] uppercase select-none disabled:cursor-default ${
                column.key === "path"
                  ? "min-w-0 flex-1"
                  : `${column.width} shrink-0 justify-center`
              }`}
            >
              {t(column.headerKey)}
              <SortIcon state={sortKey === column.key ? sortDir : null} />
            </button>
          ))}
        </div>
        <div
          id="qz-table-scroll"
          ref={scrollRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto"
        >
          {pageRows.length === 0 ? (
            <div
              id="qz-table-empty"
              className="flex min-h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center"
            >
              <PackageOpen
                size={16}
                aria-hidden
                className="text-[var(--qz-faint)]"
              />
              <p className="text-sm text-[var(--qz-muted)]">
                {t("table.empty")}
              </p>
              <p className="text-xs text-[var(--qz-faint)]">
                {t("table.emptyHint")}
              </p>
            </div>
          ) : (
            <div
              id="qz-table-spacer"
              style={{ height: `${totalH}px` }}
              className="relative w-full"
            >
              {visible.map((entry, offset) => {
                const index = startIndex + offset;
                const serial = rowBase + index + 1;
                const kind = fileKind(entry.path, entry.is_folder, {
                  folder: folderLabel,
                  file: fileLabel,
                });
                const Icon = kind.icon;
                const isSelected = selected.has(entry.path);
                return (
                  <div
                    id={`qz-table-row-${serial}`}
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
                    <div
                      id={`qz-table-row-${serial}-select`}
                      className="flex w-10 shrink-0 items-center justify-center"
                    >
                      <TableCheckbox
                        id={`qz-table-select-row-${serial}`}
                        label={t("table.selectItem", { name: entry.path })}
                        checked={isSelected}
                        onToggle={() => toggleOne(entry.path)}
                      />
                    </div>
                    <div
                      id={`qz-table-row-${serial}-index`}
                      className="flex w-12 shrink-0 items-center justify-center px-2 text-[var(--qz-faint)] tabular-nums"
                    >
                      {rowBase + index + 1}
                    </div>
                    <div
                      id={`qz-table-row-${serial}-path`}
                      className="flex h-full min-w-0 flex-1 items-center px-4"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          size={16}
                          aria-hidden
                          className="shrink-0 text-[var(--qz-muted)]"
                        />
                        <span className="truncate leading-5">{entry.path}</span>
                      </span>
                    </div>
                    <div
                      id={`qz-table-row-${serial}-type`}
                      className="flex h-full w-24 shrink-0 items-center justify-center px-4 text-[var(--qz-muted)]"
                    >
                      {kind.label}
                    </div>
                    <div
                      id={`qz-table-row-${serial}-size`}
                      className="flex h-full w-32 shrink-0 items-center justify-center overflow-hidden px-4 tabular-nums"
                    >
                      <span className="whitespace-nowrap">
                        {entry.size === null ? "—" : formatSize(entry.size)}
                      </span>
                    </div>
                    <div
                      id={`qz-table-row-${serial}-modified`}
                      className="flex h-full w-64 shrink-0 items-center justify-center overflow-hidden px-4 text-[var(--qz-muted)]"
                      title={entry.modified ?? undefined}
                    >
                      <span className="truncate whitespace-nowrap tabular-nums">
                        {formatModified(entry.modified)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
