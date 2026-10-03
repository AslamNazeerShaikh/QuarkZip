import { Archive, FolderLock, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { formatSize } from "./format";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Separator } from "./components/ui/separator";

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

function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function formatEpoch(secs: number | null): string {
  if (secs === null || secs === undefined) return "—";
  const d = new Date(secs * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  entryCount,
  loading,
  onOpen,
}: {
  archive: string | null;
  info: ArchiveInfo | null;
  entryCount: number;
  loading: boolean;
  onOpen: () => void;
}) {
  return (
    <Card className="flex min-h-0 flex-[1_1_50%] flex-col overflow-hidden">
      {!archive ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]">
            <Archive size={20} aria-hidden className="text-[var(--qz-primary)]" />
          </span>
          <div>
            <CardTitle>No archive open</CardTitle>
            <CardDescription className="mt-1">
              Open a 7z, zip, tar or 30+ other formats — or drop a file anywhere.
            </CardDescription>
          </div>
          <Button onClick={onOpen} disabled={loading} className="mt-1 min-w-40">
            <PackageOpen size={16} aria-hidden />
            {loading ? "Reading…" : "Open archive"}
          </Button>
          <p className="text-xs text-[var(--qz-faint)]">
            Powered by the pinned 7-Zip sidecar · nothing leaves your machine
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <CardHeader>
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--qz-primary-soft)]">
                <Archive size={18} aria-hidden className="text-[var(--qz-primary)]" />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate">{basename(archive)}</CardTitle>
                <CardDescription className="truncate" title={archive}>
                  File Path: {archive} · {entryCount.toLocaleString("en-US")} entries
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="info">{(info?.container_format ?? "…").toUpperCase()}</Badge>
                  {info && info.encrypted_files > 0 ? (
                    <Badge variant="warning">
                      <FolderLock size={11} aria-hidden />
                      {info.encryption_scheme} · {info.encrypted_files} encrypted
                    </Badge>
                  ) : (
                    <Badge variant="success">Not encrypted</Badge>
                  )}
                  {info?.solid === "+" && <Badge variant="neutral">Solid</Badge>}
                </div>
              </div>
            </div>
          </CardHeader>
          <div className="mx-5">
            <Separator />
          </div>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="m-auto w-full max-w-5xl">
            {loading && !info ? (
              <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                Reading archive details…
              </p>
            ) : info ? (
              <div className="flex flex-col gap-5">
                <section aria-label="Container">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Meta label="Container" value={info.container_format ?? "—"} />
                    <Meta label="Method" value={info.method ?? "—"} />
                    <Meta
                      label="Solid · Blocks"
                      value={`${info.solid ?? "—"} · ${info.blocks ?? "—"}`}
                    />
                    <Meta
                      label="Headers"
                      value={info.headers_size != null ? formatSize(info.headers_size) : "—"}
                    />
                    <Meta
                      label="Physical size"
                      value={info.physical_size != null ? formatSize(info.physical_size) : "—"}
                    />
                    <Meta
                      label="On disk"
                      value={info.container_size != null ? formatSize(info.container_size) : "—"}
                    />
                    <Meta label="Modified" value={formatEpoch(info.container_modified)} />
                    <Meta
                      label="Host OS"
                      value={info.host_os.length > 0 ? info.host_os.join(", ") : "—"}
                    />
                  </div>
                </section>
                <section aria-label="Content">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Meta label="Files" value={info.file_count.toLocaleString("en-US")} />
                    <Meta label="Folders" value={info.folder_count.toLocaleString("en-US")} />
                    <Meta
                      label="Nesting levels"
                      value={info.max_depth > 0 ? `${info.max_depth}` : "—"}
                    />
                    <Meta label="Unpacked" value={formatSize(info.total_unpacked)} />
                    <Meta label="Packed" value={formatSize(info.total_packed)} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
                        Ratio
                      </p>
                      <div className="mt-1 text-sm font-medium text-[var(--qz-text)]">
                        {info.total_unpacked > 0
                          ? `${(info.compression_ratio * 100).toFixed(1)}% of original`
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
                      label="Algorithms"
                      value={info.methods.length > 0 ? info.methods.join(" · ") : "Store / none"}
                    />
                    <Meta label="Password scheme" value={info.encryption_scheme} />
                  </div>
                </section>
                {Object.keys(info.extra).length > 0 && (
                  <section aria-label="More details">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                      {Object.entries(info.extra).map(([k, v]) => (
                        <Meta key={k} label={k} value={v || "—"} />
                      ))}
                    </div>
                  </section>
                )}
                <p className="text-xs text-[var(--qz-faint)]">
                  Parsed from 7zz l -slt · ratio = packed ÷ unpacked
                </p>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--qz-muted)]">
                Details unavailable — the listing loaded but 7zz reported no summary.
              </p>
            )}
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}
