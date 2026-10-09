import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  PackageOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCount, formatModified, formatSize } from "../lib/format";
import { fileKind } from "../lib/fileKind";
import {
  deselectPath,
  displayName,
  isUnder,
  nodeState,
  selectPath,
  selectedAncestor,
  splitForUncheck,
} from "../lib/treeSelection";
import TableCheckbox from "./ui/TableCheckbox";

export type TreeSortKey = "path" | "size" | "type" | "modified";
export type TreeSortDir = "asc" | "desc";

/// One backend chunk: bounds webview RAM the way pages once did — a folder
/// with more children grows a "Show more" row per chunk instead of
/// materializing everything.
const CHILD_CHUNK = 10_000;
const ROW_HEIGHT = 36;
const OVERSCAN = 8;

interface FolderCache {
  rows: ArchiveEntry[];
  total: number;
}

type FlatRow =
  | { kind: "node"; entry: ArchiveEntry; depth: number; guides: boolean[] }
  | { kind: "more"; parent: string; depth: number; guides: boolean[] }
  | { kind: "loading"; parent: string; depth: number; guides: boolean[] }
  | { kind: "empty"; parent: string; depth: number; guides: boolean[] };

function SortIcon({ state }: { state: TreeSortDir | null }) {
  if (state === "asc") return <ArrowUp size={14} aria-hidden />;
  if (state === "desc") return <ArrowDown size={14} aria-hidden />;
  return <ArrowUpDown size={14} aria-hidden className="opacity-40" />;
}

/// Nested file-tree browser: folders expand in place, children load from
/// the backend in bounded chunks (`get_children`), collapsing drops them
/// again so a 10M archive never sits in webview RAM. Guides draw one
/// vertical line per continuing ancestor level (static box-drawing, no
/// expand animation — motion stays out of the way of large listings).
///
/// Selection is an explicit path set with folder-prefix collapse (see
/// `treeSelection`): checking a folder selects the folder path only (the
/// extract backend expands it to the subtree), unchecking a file inside a
/// checked folder splits the ancestor into its *loaded* children. The set
/// survives collapse, chunk appends, and sort changes; a new archive
/// clears it. Sort toggles re-fetch every loaded folder in the new order.
export default function ArchiveTree({
  archive,
  totalEntries,
  selected,
  onSelectionChange,
}: {
  archive: string | null;
  totalEntries: number;
  selected: ReadonlySet<string>;
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
}) {
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<TreeSortKey>("path");
  const [sortDir, setSortDir] = useState<TreeSortDir>("asc");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [cache, setCache] = useState<Map<string, FolderCache>>(new Map());
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  // Ref-held so reset/fetch effects never re-fire on re-created callbacks.
  const selectionCb = useRef(onSelectionChange);
  selectionCb.current = onSelectionChange;
  const reqIds = useRef(new Map<string, number>());
  const sortGen = useRef(0);

  // A new archive is a new listing: drop expansion, chunks, and selection.
  const listingRef = useRef(archive);
  useEffect(() => {
    if (listingRef.current !== archive) {
      listingRef.current = archive;
      setExpanded(new Set());
      setCache(new Map());
      setLoading(new Set());
      reqIds.current.clear();
      const empty = new Set<string>();
      selectionCb.current?.(empty);
    }
  }, [archive]);

  function fetchChunk(parent: string, offset: number, append: boolean) {
    if (!archive) return;
    const reqId = (reqIds.current.get(parent) ?? 0) + 1;
    reqIds.current.set(parent, reqId);
    const gen = sortGen.current;
    const key = sortKey;
    const dir = sortDir;
    const path = archive;
    setLoading((prev) => new Set(prev).add(parent));
    void invoke<{ rows: ArchiveEntry[]; total: number }>("get_children", {
      path,
      parent,
      offset,
      limit: CHILD_CHUNK,
      sortKey: key,
      sortDir: dir,
    })
      .then((res) => {
        if (
          reqIds.current.get(parent) !== reqId ||
          sortGen.current !== gen ||
          listingRef.current !== path
        )
          return;
        setCache((prev) => {
          const next = new Map(prev);
          const prior = append ? (prev.get(parent)?.rows ?? []) : [];
          next.set(parent, {
            rows: [...prior, ...res.rows],
            total: res.total,
          });
          return next;
        });
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(parent);
          return next;
        });
      })
      .catch(() => {
        if (
          reqIds.current.get(parent) !== reqId ||
          sortGen.current !== gen ||
          listingRef.current !== path
        )
          return;
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(parent);
          return next;
        });
      });
  }

  // Root loads with the listing; a sort change drops every chunk (expansion
  // and selection survive — rows refetch in the new order on render).
  useEffect(() => {
    if (!archive) return;
    setCache(new Map());
    setLoading(new Set());
    fetchChunk("", 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archive, sortKey, sortDir]);

  function toggleExpand(path: string) {
    const isOpen = expanded.has(path);
    if (isOpen) {
      // Collapse drops the whole subtree's chunks (the RAM goal) while the
      // path-based selection survives untouched.
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      setCache((prev) => {
        const next = new Map(prev);
        for (const key of [...next.keys()]) {
          if (key === path || isUnder(path, key)) next.delete(key);
        }
        return next;
      });
    } else {
      setExpanded((prev) => new Set(prev).add(path));
      if (!cache.has(path) && !loading.has(path)) fetchChunk(path, 0, false);
    }
  }

  function loadedChildPaths(folder: string): string[] {
    return (cache.get(folder)?.rows ?? []).map((r) => r.path);
  }

  function toggleNode(entry: ArchiveEntry) {
    const path = entry.path;
    // Any click under a selected ancestor narrows it (split into loaded
    // siblings); otherwise toggle the node itself.
    const ancestor = selectedAncestor(selected, path);
    if (ancestor !== null) {
      selectionCb.current?.(
        splitForUncheck(selected, path, loadedChildPaths(ancestor)),
      );
    } else if (selected.has(path)) {
      selectionCb.current?.(deselectPath(selected, path));
    } else {
      selectionCb.current?.(selectPath(selected, path));
    }
  }

  function toggleSort(key: TreeSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    sortGen.current += 1;
    reqIds.current.clear();
  }

  // Header checkbox covers loaded rows only (the Extract All button owns
  // the whole archive): checked when every loaded row is selected.
  const loadedPaths = useMemo(() => {
    const out: string[] = [];
    for (const { rows } of cache.values()) {
      for (const r of rows) out.push(r.path);
    }
    return out;
  }, [cache]);
  const allLoadedSelected =
    loadedPaths.length > 0 && loadedPaths.every((p) => selected.has(p));
  const someLoadedSelected =
    !allLoadedSelected && loadedPaths.some((p) => selected.has(p));

  function toggleAllLoaded() {
    if (allLoadedSelected) {
      const next = new Set(selected);
      for (const p of loadedPaths) next.delete(p);
      selectionCb.current?.(next);
    } else {
      const next = new Set(selected);
      for (const p of loadedPaths) next.add(p);
      selectionCb.current?.(next);
    }
  }

  // Flattened visible rows with guide continuation per ancestor level: a
  // level draws its vertical line while its ancestor has a following
  // sibling (or an unloaded remainder behind a Show-more row).
  const flat: FlatRow[] = useMemo(() => {
    const out: FlatRow[] = [];
    const root = cache.get("")?.rows ?? [];
    const rootHasMore = (cache.get("")?.total ?? 0) > root.length;
    function walk(
      rows: ArchiveEntry[],
      depth: number,
      guides: boolean[],
      hasMore: boolean,
    ) {
      rows.forEach((entry, i) => {
        const continues =
          i < rows.length - 1 || (i === rows.length - 1 && hasMore);
        out.push({
          kind: "node",
          entry,
          depth,
          guides: [...guides, continues],
        });
        if (entry.is_folder && expanded.has(entry.path)) {
          const cached = cache.get(entry.path);
          const kids = cached?.rows ?? [];
          const more = (cached?.total ?? 0) > kids.length;
          if (kids.length > 0) {
            walk(kids, depth + 1, [...guides, continues], more);
          } else if (loading.has(entry.path)) {
            out.push({
              kind: "loading",
              parent: entry.path,
              depth: depth + 1,
              guides: [...guides, continues],
            });
          } else if ((cached?.total ?? -1) === 0) {
            out.push({
              kind: "empty",
              parent: entry.path,
              depth: depth + 1,
              guides: [...guides, continues],
            });
          }
          if (more) {
            out.push({
              kind: "more",
              parent: entry.path,
              depth: depth + 1,
              guides: [...guides, continues],
            });
          }
        }
      });
    }
    walk(root, 0, [], rootHasMore);
    if (root.length > 0 && rootHasMore) {
      out.push({ kind: "more", parent: "", depth: 0, guides: [] });
    }
    if (root.length === 0 && !loading.has("") && totalEntries > 0) {
      out.push({ kind: "loading", parent: "", depth: 0, guides: [] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, expanded, loading, totalEntries]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  // jsdom reports no layout (clientHeight 0): render everything so unit
  // tests see full content.
  const viewportHeight = scrollRef.current?.clientHeight || 0;
  const visibleCount =
    viewportHeight === 0
      ? flat.length
      : Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visible = flat.slice(startIndex, startIndex + visibleCount);
  const totalH = flat.length * ROW_HEIGHT;
  const anyLoading = loading.size > 0;

  const columns: { key: TreeSortKey; headerKey: string; width: string }[] = [
    { key: "path", headerKey: "table.colName", width: "flex-1" },
    { key: "type", headerKey: "table.colType", width: "w-24" },
    { key: "size", headerKey: "table.colSize", width: "w-32" },
    { key: "modified", headerKey: "table.colModified", width: "w-64" },
  ];

  return (
    <div
      id="qz-tree-root"
      aria-busy={anyLoading}
      className={`relative min-h-0 w-full min-w-0 flex-1 transition-opacity ${anyLoading ? "opacity-60" : ""}`}
    >
      <div
        id="qz-tree-card"
        className="qz-material-bar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[13px] border border-[var(--qz-border)] text-[13px]"
      >
        <div
          id="qz-tree-header"
          className="qz-material-bar flex shrink-0 items-center"
          style={{ height: ROW_HEIGHT }}
        >
          <div
            id="qz-tree-header-select"
            className="flex w-10 shrink-0 items-center justify-center"
          >
            <TableCheckbox
              id="qz-tree-select-all"
              label={t("tree.selectAllLoaded")}
              checked={
                allLoadedSelected ? true : someLoadedSelected ? "mixed" : false
              }
              onToggle={toggleAllLoaded}
            />
          </div>
          {columns.map((column) => (
            <button
              id={`qz-tree-sort-${column.key}`}
              key={column.key}
              type="button"
              onClick={() => toggleSort(column.key)}
              aria-label={`${t(column.headerKey)} — ${t("table.sortTip")}`}
              title={t("table.sortTip")}
              className={`flex h-full items-center gap-1 px-4 text-xs font-semibold tracking-wide text-[var(--qz-faint)] uppercase select-none transition-all duration-150 motion-safe:active:scale-[0.98] ${
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
          id="qz-tree-scroll"
          ref={scrollRef}
          role="tree"
          aria-label={t("tree.label")}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto"
        >
          {flat.length === 0 && !anyLoading ? (
            <div
              id="qz-tree-empty"
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
              id="qz-tree-spacer"
              style={{ height: `${totalH}px` }}
              className="relative w-full"
            >
              {visible.map((row, offset) => {
                const index = startIndex + offset;
                if (row.kind === "more") {
                  const cached = cache.get(row.parent);
                  const remaining =
                    (cached?.total ?? 0) - (cached?.rows.length ?? 0);
                  const step = formatCount(Math.min(CHILD_CHUNK, remaining));
                  return (
                    <div
                      id={`qz-tree-row-${index}-more`}
                      key={`more-${row.parent}-${cached?.rows.length ?? 0}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${ROW_HEIGHT}px`,
                        transform: `translateY(${index * ROW_HEIGHT}px)`,
                      }}
                      className="flex items-center justify-center border-t border-[var(--qz-border)]"
                    >
                      <button
                        id={`qz-tree-more-${index}`}
                        type="button"
                        title={t("tree.showMore", {
                          count: step,
                          remaining: formatCount(remaining),
                        })}
                        disabled={loading.has(row.parent)}
                        onClick={() =>
                          fetchChunk(row.parent, cached?.rows.length ?? 0, true)
                        }
                        className="rounded-[7px] px-3 py-1 text-xs font-medium text-[var(--qz-primary)] outline-none transition-all duration-150 hover:underline motion-safe:active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:opacity-50"
                      >
                        {t("tree.showMore", {
                          count: step,
                          remaining: formatCount(remaining),
                        })}
                      </button>
                    </div>
                  );
                }
                if (row.kind === "loading") {
                  return (
                    <div
                      id={`qz-tree-row-${index}-loading`}
                      key={`loading-${row.parent}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${ROW_HEIGHT}px`,
                        transform: `translateY(${index * ROW_HEIGHT}px)`,
                      }}
                      className="flex items-center gap-2 border-t border-[var(--qz-border)] px-4 text-xs text-[var(--qz-faint)]"
                    >
                      <Guides guides={row.guides} />
                      <span className="animate-pulse">{t("tree.loading")}</span>
                    </div>
                  );
                }
                if (row.kind === "empty") {
                  return (
                    <div
                      id={`qz-tree-row-${index}-empty`}
                      key={`empty-${row.parent}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${ROW_HEIGHT}px`,
                        transform: `translateY(${index * ROW_HEIGHT}px)`,
                      }}
                      className="flex items-center border-t border-[var(--qz-border)] px-4 text-xs text-[var(--qz-faint)]"
                    >
                      <Guides guides={row.guides} />
                      <span>{t("tree.emptyFolder")}</span>
                    </div>
                  );
                }
                return (
                  <TreeNodeRow
                    key={row.entry.path}
                    index={index}
                    entry={row.entry}
                    depth={row.depth}
                    guides={row.guides}
                    state={nodeState(selected, row.entry.path)}
                    expanded={
                      row.entry.is_folder && expanded.has(row.entry.path)
                    }
                    onToggleExpand={() => toggleExpand(row.entry.path)}
                    onToggleSelect={() => toggleNode(row.entry)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/// One vertical guide per ancestor level: a line while that level
/// continues (static box-drawing, no animation).
function Guides({ guides }: { guides: boolean[] }) {
  return (
    <>
      {guides.map((continues, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-full w-4 shrink-0 ${continues ? "border-l border-[var(--qz-border)]" : ""}`}
        />
      ))}
    </>
  );
}

function TreeNodeRow({
  index,
  entry,
  depth,
  guides,
  state,
  expanded,
  onToggleExpand,
  onToggleSelect,
}: {
  index: number;
  entry: ArchiveEntry;
  depth: number;
  guides: boolean[];
  state: boolean | "mixed";
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
}) {
  const { t } = useLanguage();
  const kind = fileKind(entry.path, entry.is_folder, {
    folder: t("filekind.folder"),
    file: t("filekind.file"),
  });
  const Icon = kind.icon;
  const isSelected = state !== false;
  const name = displayName(entry.path);
  return (
    <div
      id={`qz-tree-row-${index}`}
      role="treeitem"
      aria-expanded={entry.is_folder ? expanded : undefined}
      aria-selected={isSelected}
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
        id={`qz-tree-row-${index}-select`}
        className="flex w-10 shrink-0 items-center justify-center"
      >
        <TableCheckbox
          id={`qz-tree-select-row-${index}`}
          label={t("table.selectItem", { name: entry.path })}
          checked={state}
          onToggle={onToggleSelect}
        />
      </div>
      <div
        id={`qz-tree-row-${index}-path`}
        className="flex h-full min-w-0 flex-1 items-center"
      >
        <span className="flex min-w-0 items-center">
          <Guides guides={guides.slice(0, depth)} />
          {entry.is_folder ? (
            <button
              id={`qz-tree-expand-${index}`}
              type="button"
              aria-label={
                expanded ? t("tree.collapseFolder") : t("tree.expandFolder")
              }
              title={
                expanded ? t("tree.collapseFolder") : t("tree.expandFolder")
              }
              aria-expanded={expanded}
              onClick={onToggleExpand}
              className="grid h-6 w-4 shrink-0 place-items-center rounded-[5px] text-[var(--qz-faint)] outline-none transition-all duration-150 hover:text-[var(--qz-text)] motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
            >
              <ChevronRight
                size={14}
                aria-hidden
                className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span aria-hidden className="w-4 shrink-0" />
          )}
          <Icon
            size={16}
            aria-hidden
            className="mx-1 shrink-0 text-[var(--qz-muted)]"
          />
          <span title={entry.path} className="truncate leading-5">
            {name}
          </span>
        </span>
      </div>
      <div
        id={`qz-tree-row-${index}-type`}
        title={kind.label}
        className="flex h-full w-24 shrink-0 items-center justify-center overflow-hidden px-4 text-[var(--qz-muted)]"
      >
        <span className="truncate whitespace-nowrap">{kind.label}</span>
      </div>
      <div
        id={`qz-tree-row-${index}-size`}
        className="flex h-full w-32 shrink-0 items-center justify-center overflow-hidden px-4 tabular-nums"
      >
        <span className="whitespace-nowrap">
          {entry.is_folder
            ? "—"
            : entry.size === null
              ? "—"
              : formatSize(entry.size)}
        </span>
      </div>
      <div
        id={`qz-tree-row-${index}-modified`}
        title={entry.modified ?? undefined}
        className="flex h-full w-64 shrink-0 items-center justify-center overflow-hidden px-4 text-[var(--qz-muted)]"
      >
        <span className="truncate whitespace-nowrap tabular-nums">
          {formatModified(entry.modified)}
        </span>
      </div>
    </div>
  );
}
