import { Archive, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { formatCount, formatDateTimeLocal, formatSize } from "./format";
import { Button } from "./components/ui/button";
import { Card, CardDescription, CardTitle } from "./components/ui/card";
import { useLanguage } from "./i18n/LanguageContext";

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
      <div className="mt-1 truncate text-sm font-medium text-[var(--qz-text)]">{value}</div>
    </div>
  );
}

/// Top-half overview card: empty state holds the centered Open action;
/// once an archive is open the same card shows `7zz l -slt` container +
/// content + security metadata. Always occupies half the vertical space
/// (parent gives it `flex-[1_1_50%]`).
export default function ArchiveOverview({
  archive,
  info,
  loading,
  onOpen,
}: {
  archive: string | null;
  info: ArchiveInfo | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Card className="flex min-h-0 flex-[1_1_50%] flex-col overflow-hidden">
      {!archive ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]">
            <Archive size={20} aria-hidden className="text-[var(--qz-primary)]" />
          </span>
          <div>
            <CardTitle>{t("overview.emptyTitle")}</CardTitle>
            <CardDescription className="mt-1">
              {t("overview.emptyDesc")}
            </CardDescription>
          </div>
          <Button onClick={onOpen} disabled={loading} className="mt-1 min-w-40">
            <PackageOpen size={16} aria-hidden />
            {loading ? t("overview.reading") : t("overview.openCta")}
          </Button>
          <p className="text-xs text-[var(--qz-faint)]">
            {t("overview.powered")}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* No card header: path lives in the centered window title, and the
              status pills live with the details below. */}
          {/* No vertical padding: the centered block owns the rhythm. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
            <div className="m-auto w-full max-w-5xl">
            {loading && !info ? (
              <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                {t("overview.readingDetails")}
              </p>
            ) : info ? (
              <div className="flex flex-col gap-5">
                <section aria-label={t("overview.sectionContainer")}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Meta label={t("overview.meta.container")} value={info.container_format ?? "—"} />
                    <Meta label={t("overview.meta.method")} value={info.method ?? "—"} />
                    <Meta
                      label={t("overview.meta.solidBlocks")}
                      value={`${info.solid ?? "—"} · ${info.blocks ?? "—"}`}
                    />
                    <Meta
                      label={t("overview.meta.headers")}
                      value={info.headers_size != null ? formatSize(info.headers_size) : "—"}
                    />
                    <Meta
                      label={t("overview.meta.physicalSize")}
                      value={info.physical_size != null ? formatSize(info.physical_size) : "—"}
                    />
                    <Meta
                      label={t("overview.meta.onDisk")}
                      value={info.container_size != null ? formatSize(info.container_size) : "—"}
                    />
                    <Meta label={t("overview.meta.modified")} value={formatEpoch(info.container_modified)} />
                    <Meta
                      label={t("overview.meta.hostOs")}
                      value={info.host_os.length > 0 ? info.host_os.join(", ") : "—"}
                    />
                  </div>
                </section>
                <section aria-label={t("overview.sectionContent")}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Meta label={t("overview.meta.files")} value={formatCount(info.file_count)} />
                    <Meta label={t("overview.meta.folders")} value={formatCount(info.folder_count)} />
                    <Meta
                      label={t("overview.meta.nesting")}
                      value={info.max_depth > 0 ? `${info.max_depth}` : "—"}
                    />
                    <Meta label={t("overview.meta.unpacked")} value={formatSize(info.total_unpacked)} />
                    <Meta label={t("overview.meta.packed")} value={formatSize(info.total_packed)} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
                        {t("overview.meta.ratio")}
                      </p>
                      <div className="mt-1 text-sm font-medium text-[var(--qz-text)]">
                        {info.total_unpacked > 0
                          ? t("overview.meta.ratioOf", {
                              pct: (info.compression_ratio * 100).toFixed(1),
                            })
                          : "—"}
                      </div>
                      {info.total_unpacked > 0 && (
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
                          role="progressbar"
                          aria-valuenow={Math.round(info.compression_ratio * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--qz-primary)]"
                            style={{
                              width: `${Math.min(100, info.compression_ratio * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <Meta
                      label={t("overview.meta.algorithms")}
                      value={info.methods.length > 0 ? info.methods.join(" · ") : t("overview.meta.storeNone")}
                    />
                    <Meta label={t("overview.meta.passwordScheme")} value={info.encryption_scheme} />
                  </div>
                </section>
                {Object.keys(info.extra).length > 0 && (
                  <section aria-label={t("overview.sectionMore")}>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                      {Object.entries(info.extra).map(([k, v]) => (
                        <Meta key={k} label={k} value={v || "—"} />
                      ))}
                    </div>
                  </section>
                )}
                <p className="text-xs text-[var(--qz-faint)]">
                  {t("overview.parsedNote")}
                </p>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                {t("overview.unavailable")}
              </p>
            )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
