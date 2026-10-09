import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, PackageOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCount, formatModified, formatSize } from "../lib/format";
import { fileKind } from "../lib/fileKind";
import {
  deselectPath,
  displayName,
  guidePrefix,
  isUnder,
  nodeState,
  selectPath,
  selectedAncestor,
  splitForUncheck,
} from "../lib/treeSelection";
import TableCheckbox from "./ui/TableCheckbox";

/// One backend chunk: bounds webview RAM the way pages once did — a folder
/// with more children grows a "Show more" row per chunk instead of
/// materializing everything.
const CHILD_CHUNK = 10_000;
const ROW_HEIGHT = 36;
const OVERSCAN = 8;
/// Skeleton placeholder rows per loading folder (bounded shimmer, never
/// real data).
const SKELETON_ROWS = 6;
/// Typeahead buffer lifetime: keystrokes further apart start a new search.
const TYPEAHEAD_MS = 500;

interface FolderCache {
  rows: ArchiveEntry[];
  total: number;
}

type FlatRow =
  | { kind: "node"; entry: ArchiveEntry; depth: number; guides: boolean[] }
  | { kind: "more"; parent: string; depth: number; guides: boolean[] }
  | { kind: "loading"; parent: string; depth: number; guides: boolean[] }
  | { kind: "empty"; parent: string; depth: number; guides: boolean[] };

/// Nested file-tree browser: folders expand in place, children load from
/// the backend in bounded chunks (`get_children`, always folders-first
/// natural order — no column sorting, which re-sorted millions of rows and
/// froze the UI), collapsing drops them again so a 10M archive never sits
/// in webview RAM. Gutters draw Unicode box-drawing guides (├── └── │ ─,
/// monospace text that always paints — instant expand, no animation).
///
/// Keyboard (WAI-ARIA tree pattern, roving tabindex): Up/Down move,
/// Right expands (or steps into an open folder), Left collapses (or steps
/// to the parent), Home/End jump, Enter toggles folders (loads more on a
/// Show-more row), Space toggles the checkbox, typing jumps to the next
/// visible name with that prefix. Selection is an explicit path set with
/// folder-prefix collapse (see `treeSelection`): checking a folder selects
/// the folder path only (the extract backend expands it to the subtree),
/// unchecking a file inside a checked folder splits the ancestor into its
/// *loaded* children. The set survives collapse, chunk appends, and new
/// sorts; a new archive clears it.
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
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [cache, setCache] = useState<Map<string, FolderCache>>(new Map());
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  /// Keyboard focus as a flattened-row index (`null` = nothing focused yet;
  /// Tab lands on the first row). Rows carry roving tabindex.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  // Ref-held so reset/fetch effects never re-fire on re-created callbacks.
  const selectionCb = useRef(onSelectionChange);
  selectionCb.current = onSelectionChange;
  const reqIds = useRef(new Map<string, number>());
  const typeahead = useRef<{
    text: string;
    timer: ReturnType<typeof setTimeout> | null;
  }>({
    text: "",
    timer: null,
  });
  useEffect(
    () => () => {
      if (typeahead.current.timer) clearTimeout(typeahead.current.timer);
    },
    [],
  );

  // A new archive is a new listing: drop expansion, chunks, and selection.
  const listingRef = useRef(archive);
  useEffect(() => {
    if (listingRef.current !== archive) {
      listingRef.current = archive;
      setExpanded(new Set());
      setCache(new Map());
      setLoading(new Set());
      setFocusIndex(null);
      reqIds.current.clear();
      const empty = new Set<string>();
      selectionCb.current?.(empty);
    }
  }, [archive]);

  function fetchChunk(parent: string, offset: number, append: boolean) {
    if (!archive) return;
    const reqId = (reqIds.current.get(parent) ?? 0) + 1;
    reqIds.current.set(parent, reqId);
    const path = archive;
    setLoading((prev) => new Set(prev).add(parent));
    void invoke<{ rows: ArchiveEntry[]; total: number }>("get_children", {
      path,
      parent,
      offset,
      limit: CHILD_CHUNK,
      sortKey: "path",
      sortDir: "asc",
    })
      .then((res) => {
        if (reqIds.current.get(parent) !== reqId || listingRef.current !== path)
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
        if (reqIds.current.get(parent) !== reqId || listingRef.current !== path)
          return;
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(parent);
          return next;
        });
      });
  }

  // Root loads with the listing.
  useEffect(() => {
    if (!archive) return;
    setCache(new Map());
    setLoading(new Set());
    fetchChunk("", 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archive]);

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
  // sibling (or an unloaded remainder behind a Show-more row). Loading
  // folders show bounded skeleton rows (never real data).
  const flat: FlatRow[] = useMemo(() => {
    const out: FlatRow[] = [];
    const root = cache.get("")?.rows ?? [];
    const rootHasMore = (cache.get("")?.total ?? 0) > root.length;
    function pushSkeletons(parent: string, depth: number, guides: boolean[]) {
      for (let s = 0; s < SKELETON_ROWS; s++) {
        out.push({ kind: "loading", parent, depth, guides });
      }
    }
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
            pushSkeletons(entry.path, depth + 1, [...guides, continues]);
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
    if (root.length === 0) {
      if (loading.has("")) pushSkeletons("", 0, []);
      else if (totalEntries > 0) {
        // Loaded nothing and idle (a failed fetch): one shimmer row holds
        // the space instead of a blank card.
        out.push({ kind: "loading", parent: "", depth: 0, guides: [] });
      }
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

  // Focus follows keyboard movement: clamp into range, scroll the row into
  // view, then move DOM focus (preventScroll — we position it ourselves).
  useEffect(() => {
    if (focusIndex === null) return;
    if (flat.length === 0) {
      setFocusIndex(null);
      return;
    }
    const clamped = Math.min(Math.max(0, focusIndex), flat.length - 1);
    if (clamped !== focusIndex) {
      setFocusIndex(clamped);
      return;
    }
    const top = clamped * ROW_HEIGHT;
    const height = viewportHeight || totalH;
    if (top < scrollTop) setScrollTop(top);
    else if (top + ROW_HEIGHT > scrollTop + height)
      setScrollTop(top + ROW_HEIGHT - height);
    document
      .getElementById(`qz-tree-row-${clamped}`)
      ?.focus({ preventScroll: true });
  }, [focusIndex, flat.length, viewportHeight, scrollTop, totalH]);

  function focusRow(index: number) {
    setFocusIndex(Math.min(Math.max(0, index), flat.length - 1));
  }

  function rowEntryAt(index: number): ArchiveEntry | null {
    const row = flat[index];
    return row && row.kind === "node" ? row.entry : null;
  }

  function parentRowIndex(index: number): number | null {
    const row = flat[index];
    if (!row || row.kind !== "node" || row.depth === 0) return null;
    for (let i = index - 1; i >= 0; i--) {
      const cand = flat[i];
      if (cand.kind === "node" && cand.depth === row.depth - 1) return i;
    }
    return null;
  }

  function onTreeKeyDown(e: React.KeyboardEvent) {
    if (flat.length === 0) return;
    const cur = focusIndex ?? 0;
    const row = flat[Math.min(cur, flat.length - 1)];
    const move = (next: number) => {
      e.preventDefault();
      focusRow(next);
    };
    switch (e.key) {
      case "ArrowDown":
        move(
          focusIndex === null ? 0 : Math.min(focusIndex + 1, flat.length - 1),
        );
        return;
      case "ArrowUp":
        move(
          focusIndex === null ? flat.length - 1 : Math.max(focusIndex - 1, 0),
        );
        return;
      case "Home":
        move(0);
        return;
      case "End":
        move(flat.length - 1);
        return;
      case "ArrowRight": {
        if (row.kind !== "node" || !row.entry.is_folder) return;
        e.preventDefault();
        if (!expanded.has(row.entry.path)) toggleExpand(row.entry.path);
        else focusRow(Math.min(cur + 1, flat.length - 1));
        return;
      }
      case "ArrowLeft": {
        if (row.kind !== "node" || !row.entry.is_folder) return;
        e.preventDefault();
        if (expanded.has(row.entry.path)) toggleExpand(row.entry.path);
        else {
          const parent = parentRowIndex(cur);
          if (parent !== null) focusRow(parent);
        }
        return;
      }
      case "Enter": {
        if (row.kind === "more") {
          e.preventDefault();
          const cached = cache.get(row.parent);
          fetchChunk(row.parent, cached?.rows.length ?? 0, true);
        } else if (row.kind === "node" && row.entry.is_folder) {
          e.preventDefault();
          toggleExpand(row.entry.path);
        }
        return;
      }
      case " ": {
        if (row.kind !== "node") return;
        e.preventDefault();
        toggleNode(row.entry);
        return;
      }
      default: {
        // Typeahead: jump to the next visible name with the typed prefix.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const prev = typeahead.current;
          if (prev.timer) clearTimeout(prev.timer);
          const text = (prev.text + e.key).toLowerCase();
          prev.text = text;
          prev.timer = setTimeout(() => {
            typeahead.current.text = "";
          }, TYPEAHEAD_MS);
          for (let step = 1; step <= flat.length; step++) {
            const i = (cur + step) % flat.length;
            const entry = rowEntryAt(i);
            if (
              entry &&
              displayName(entry.path).toLowerCase().startsWith(text)
            ) {
              e.preventDefault();
              focusRow(i);
              break;
            }
          }
        }
      }
    }
  }

  const columns: { key: string; headerKey: string; width: string }[] = [
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
        {/* Static header: one fixed order (folders-first, natural) — column
            sorting re-sorted millions of rows and froze the UI, so it goes. */}
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
            <div
              id={`qz-tree-col-${column.key}`}
              key={column.key}
              className={`flex h-full items-center px-4 text-xs font-semibold tracking-wide text-[var(--qz-faint)] uppercase select-none ${
                column.key === "path"
                  ? "min-w-0 flex-1"
                  : `${column.width} shrink-0 justify-center`
              }`}
            >
              {t(column.headerKey)}
            </div>
          ))}
        </div>
        <div
          id="qz-tree-scroll"
          ref={scrollRef}
          role="tree"
          aria-label={t("tree.label")}
          tabIndex={-1}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          onKeyDown={onTreeKeyDown}
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
                      key={`loading-${row.parent}-${index}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${ROW_HEIGHT}px`,
                        transform: `translateY(${index * ROW_HEIGHT}px)`,
                      }}
                      className="flex items-center gap-2 border-t border-[var(--qz-border)] px-4"
                      aria-hidden
                    >
                      <GuidePrefix guides={row.guides} depth={row.depth} />
                      <span className="qz-skel h-3 w-40 rounded-full" />
                      <span className="qz-skel h-3 w-12 shrink-0 rounded-full" />
                      <span className="qz-skel h-3 w-14 shrink-0 rounded-full" />
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
                      <GuidePrefix guides={row.guides} depth={row.depth} />
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
                    childTotal={
                      row.entry.is_folder
                        ? cache.get(row.entry.path)?.total
                        : undefined
                    }
                    focused={focusIndex === index}
                    onFocusRow={() => setFocusIndex(index)}
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

/// Box-drawing gutter prefix for loading/empty rows: monospace text that
/// always paints (CSS border guides collapsed inside centered flex rows).
function GuidePrefix({ guides, depth }: { guides: boolean[]; depth: number }) {
  return (
    <span
      aria-hidden
      className="shrink-0 font-mono whitespace-pre text-[var(--qz-faint)]"
    >
      {guidePrefix(guides, depth)}
    </span>
  );
}

function TreeNodeRow({
  index,
  entry,
  depth,
  guides,
  state,
  expanded,
  childTotal,
  focused,
  onFocusRow,
  onToggleExpand,
  onToggleSelect,
}: {
  index: number;
  entry: ArchiveEntry;
  depth: number;
  guides: boolean[];
  state: boolean | "mixed";
  expanded: boolean;
  /// Immediate-child total (folders with a loaded chunk only): shown as a
  /// muted count beside the name.
  childTotal: number | undefined;
  focused: boolean;
  onFocusRow: () => void;
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
      tabIndex={focused ? 0 : -1}
      onFocus={onFocusRow}
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
      className={`flex items-center border-t border-[var(--qz-border)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--qz-primary)]/50 ${
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
          <span
            aria-hidden
            className="shrink-0 font-mono whitespace-pre text-[var(--qz-faint)]"
          >
            {guidePrefix(guides, depth)}
          </span>
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
              className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-[var(--qz-faint)] outline-none transition-all duration-150 hover:text-[var(--qz-text)] motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
            >
              <ChevronRight
                size={14}
                aria-hidden
                className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span aria-hidden className="w-6 shrink-0" />
          )}
          <Icon
            size={16}
            aria-hidden
            className="mx-1 shrink-0 text-[var(--qz-muted)]"
          />
          <span title={entry.path} className="truncate leading-5">
            {name}
          </span>
          {entry.is_folder && childTotal !== undefined && childTotal > 0 && (
            <span className="ml-2 shrink-0 text-xs tabular-nums text-[var(--qz-faint)]">
              {childTotal === 1
                ? t("tree.itemOne")
                : t("tree.itemsOther", { count: formatCount(childTotal) })}
            </span>
          )}
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
