import {
  Archive,
  Hash,
  MoreHorizontal,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatCount, formatDateTimeLocal, formatSize } from "../lib/format";
import { Button } from "./ui/button";
import { Card, CardDescription, CardTitle } from "./ui/card";
import { useLanguage } from "../i18n/LanguageContext";

/// Mirrors `archive::ArchiveInfo` (snake_case over the Tauri bridge).
export interface ArchiveInfo {
  container_format: string | null;
  physical_size: number | null;
  headers_size: number | null;
  method: string | null;
  solid: string | null;
  blocks: string | null;
  file_count: number;
  folder_count: number;
  total_unpacked: number;
  total_packed: number;
  compression_ratio: number;
  max_depth: number;
  methods: string[];
  encrypted_files: number;
  encryption_scheme: string;
  host_os: string[];
  container_size: number | null;
  container_modified: number | null;
  extra: Record<string, string>;
}

function formatEpoch(secs: number | null): string {
  if (secs === null || secs === undefined) return "—";
  const d = new Date(secs * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDateTimeLocal(d);
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      {/* Reference micro label: 11px uppercase, letter-spaced, tertiary. */}
      <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
        {label}
      </p>
      <div className="mt-1 truncate text-sm font-medium text-[var(--qz-text)]">
        {value}
      </div>
    </div>
  );
}

/// Top-half overview card: empty state holds the centered Open action;
/// once an archive is open the same card shows `7zz l -slt` container +
/// content + security metadata. Expanded it shares the space equally with
/// the table (`flex-1` each); collapsed it shrink-wraps the integrity
/// action row (`flex-none`) so the table absorbs the freed space. Details
/// hug the card top; the action row is pinned to the card bottom.
export default function ArchiveOverview({
  archive,
  info,
  loading,
  onOpen,
  onTest = () => {},
  onChecksum = () => {},
  middleControls,
  utilityControls,
}: {
  archive: string | null;
  info: ArchiveInfo | null;
  loading: boolean;
  onOpen: () => void;
  onTest?: () => void;
  onChecksum?: () => void;
  /// Pagination cluster: rendered only when open, ahead of the utilities
  /// in the action-row middle.
  middleControls?: ReactNode;
  /// Theme / Language / About cluster: left-aligned row of its own when
  /// empty, middle of the action row (after pagination) when open.
  utilityControls?: ReactNode;
}) {
  const { t } = useLanguage();
  // Three card states. Startup (no archive): flex-1, sharing the column
  // equally with the table. Open: shrink-wrapped around the fixed 16-cell
  // grid (never an internal scrollbar); the table absorbs the rest.
  // Collapsed: action row only. `showExtra` grows the card with the full
  // engine metadata for advanced users (table shrinks); collapsing hides
  // it all, and re-expanding shows the Extra button without the extras
  // until pressed again. A new archive resets the toggle.
  const [collapsed, setCollapsed] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  useEffect(() => {
    setShowExtra(false);
  }, [archive]);
  const toggleLabel = collapsed ? t("overview.expand") : t("overview.collapse");
  const extraLabel = showExtra ? t("overview.less") : t("overview.more");
  // No engine extras → no toggle: a disabled dead button helps nobody.
  // The cell unmounts (like the collapsed state), so the middle cluster
  // shifts to the extreme left.
  const hasExtras = info !== null && Object.keys(info.extra).length > 0;
  function toggleCollapsed() {
    if (collapsed) setShowExtra(false);
    setCollapsed((c) => !c);
  }
  const actionButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" size="bar" onClick={onTest} className="w-32">
        <ShieldCheck size={14} aria-hidden />
        {t("overview.test")}
      </Button>
      <Button
        variant="secondary"
        size="bar"
        onClick={onChecksum}
        className="w-32"
      >
        <Hash size={14} aria-hidden />
        {t("overview.checksum")}
      </Button>
      {/* Same secondary/bar shell as the row (h-9, 9px radius, 1px
        border); square icon-only, glyph flips with the state. */}
      <Button
        variant="secondary"
        size="bar"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        className="w-9 px-0"
      >
        <span aria-hidden className="text-[15px] leading-none">
          {collapsed ? "▼" : "▲"}
        </span>
      </Button>
    </div>
  );
  return (
    // Fixed-geometry card: the 16-cell grid is identical for every
    // archive (`—` for N/A), the ratio track always reserves its row, and
    // the open card shrink-wraps its content — never an internal
    // scrollbar. Startup (empty) shares the column equally with the table.
    // The table absorbs all leftover space (it is the only scroller
    // besides menus and dropdowns).
    <Card
      className={
        archive
          ? "flex min-h-0 flex-none flex-col overflow-hidden"
          : "flex min-h-0 flex-1 flex-col overflow-hidden"
      }
    >
      {!archive ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]">
              <Archive
                size={20}
                aria-hidden
                className="text-[var(--qz-primary)]"
              />
            </span>
            <div>
              <CardTitle>{t("overview.emptyTitle")}</CardTitle>
              <CardDescription className="mt-1">
                {t("overview.emptyDesc")}
              </CardDescription>
            </div>
            <Button
              onClick={onOpen}
              disabled={loading}
              className="mt-1 min-w-40"
            >
              <PackageOpen size={16} aria-hidden />
              {loading ? t("overview.reading") : t("overview.openCta")}
            </Button>
            <p className="text-xs text-[var(--qz-faint)]">
              {t("overview.powered")}
            </p>
          </div>
          {/* Utilities live here until an archive opens: extreme left,
            same card padding as the open action row. */}
          {utilityControls && (
            <div className="flex flex-wrap items-center justify-start gap-2 px-5 pb-5">
              {utilityControls}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* No card header: path lives in the centered window title, and the
              status pills live with the details below. */}
          {!collapsed && (
            /* Details hug the top (horizontal centering only, modest top
              inset) — no centering slack above/below. The action row
              below is pinned to the card bottom instead of scrolling. */
            <div className="flex flex-col px-5 pt-5">
              <div className="mx-auto w-full max-w-5xl">
                {loading && !info ? (
                  <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                    {t("overview.readingDetails")}
                  </p>
                ) : info ? (
                  <div className="flex flex-col gap-5">
                    <section aria-label={t("overview.sectionContainer")}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                        <Meta
                          label={t("overview.meta.container")}
                          value={info.container_format ?? "—"}
                        />
                        <Meta
                          label={t("overview.meta.method")}
                          value={info.method ?? "—"}
                        />
                        <Meta
                          label={t("overview.meta.solidBlocks")}
                          value={`${info.solid ?? "—"} · ${info.blocks ?? "—"}`}
                        />
                        <Meta
                          label={t("overview.meta.headers")}
                          value={
                            info.headers_size != null
                              ? formatSize(info.headers_size)
                              : "—"
                          }
                        />
                        <Meta
                          label={t("overview.meta.physicalSize")}
                          value={
                            info.physical_size != null
                              ? formatSize(info.physical_size)
                              : "—"
                          }
                        />
                        <Meta
                          label={t("overview.meta.onDisk")}
                          value={
                            info.container_size != null
                              ? formatSize(info.container_size)
                              : "—"
                          }
                        />
                        <Meta
                          label={t("overview.meta.modified")}
                          value={formatEpoch(info.container_modified)}
                        />
                        <Meta
                          label={t("overview.meta.hostOs")}
                          value={
                            info.host_os.length > 0
                              ? info.host_os.join(", ")
                              : "—"
                          }
                        />
                      </div>
                    </section>
                    <section aria-label={t("overview.sectionContent")}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                        <Meta
                          label={t("overview.meta.files")}
                          value={formatCount(info.file_count)}
                        />
                        <Meta
                          label={t("overview.meta.folders")}
                          value={formatCount(info.folder_count)}
                        />
                        <Meta
                          label={t("overview.meta.nesting")}
                          value={info.max_depth > 0 ? `${info.max_depth}` : "—"}
                        />
                        <Meta
                          label={t("overview.meta.unpacked")}
                          value={formatSize(info.total_unpacked)}
                        />
                        <Meta
                          label={t("overview.meta.packed")}
                          value={formatSize(info.total_packed)}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
                            {t("overview.meta.ratio")}
                          </p>
                          <div className="mt-1 text-sm font-medium text-[var(--qz-text)]">
                            {info.total_unpacked > 0
                              ? t("overview.meta.ratioOf", {
                                  pct: (info.compression_ratio * 100).toFixed(
                                    1,
                                  ),
                                })
                              : "—"}
                          </div>
                        </div>
                        <Meta
                          label={t("overview.meta.algorithms")}
                          value={
                            info.methods.length > 0
                              ? info.methods.join(" · ")
                              : t("overview.meta.storeNone")
                          }
                        />
                        <Meta
                          label={t("overview.meta.passwordScheme")}
                          value={info.encryption_scheme}
                        />
                      </div>
                    </section>
                    {showExtra && Object.keys(info.extra).length > 0 && (
                      // Advanced metadata, maximum engine detail. Capped so
                      // a pathological key count can never squeeze the table
                      // out — typical archives (1–2 rows) never scroll.
                      <section
                        aria-label={t("overview.sectionExtra")}
                        className="max-h-40 min-h-0 overflow-y-auto"
                      >
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                          {Object.entries(info.extra).map(([k, v]) => (
                            <Meta key={k} label={k} value={v || "—"} />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                    {t("overview.unavailable")}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Integrity actions need only the open archive, not the parsed
          summary — pinned to the card bottom, available collapsed,
          loading, or when details are unavailable. The More toggle sits
          left in the same row (same shell as Test/Checksum); it hides
          with the collapsed card and never auto-reopens the extras.
          Pagination + utilities ride the middle (between More and Test),
          wrapping under on narrow windows. Collapsed, the More cell
          unmounts entirely (not an empty spacer) so the middle cluster
          shifts to the extreme left; expanding puts it back. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-5 pt-4 pb-5">
            {!collapsed && hasExtras && (
              <div>
                <Button
                  variant="secondary"
                  size="bar"
                  onClick={() => setShowExtra((s) => !s)}
                  aria-expanded={showExtra}
                  aria-label={extraLabel}
                  title={extraLabel}
                  className="w-32"
                >
                  <MoreHorizontal size={14} aria-hidden />
                  {extraLabel}
                </Button>
              </div>
            )}
            {(middleControls || utilityControls) && (
              <div
                data-testid="card-controls"
                className="flex min-w-0 flex-wrap items-center gap-2"
              >
                {middleControls}
                {utilityControls}
              </div>
            )}
            {actionButtons}
          </div>
        </div>
      )}
    </Card>
  );
}
