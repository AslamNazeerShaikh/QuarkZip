import { FolderOpen, X } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCount, formatSize } from "../lib/format";

export interface LoadStats {
  bytes: number | null;
  entries: number;
}

function Stat({
  label,
  value,
  id,
}: {
  label: string;
  value: string;
  id?: string;
}) {
  return (
    <div id={id} className="flex min-w-0 items-baseline justify-between gap-4">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-[var(--qz-text)] tabular-nums">
        {value}
      </p>
    </div>
  );
}

/// Opening-archive progress popup. The engine reports no percent, so the bar
/// is indeterminate and the rows show live counters instead: completed
/// entries, stdout bytes collected, elapsed time, throughput. Totals are
/// unknowable upfront, so no ETA is shown. Cancel kills the sidecar; the
/// previous listing stays intact. Backdrop clicks never dismiss it.
export default function LoadDialog({
  open,
  archive,
  phase,
  stats,
  elapsedMs,
  onCancel,
}: {
  open: boolean;
  archive: string;
  phase: "listing" | "details";
  stats: LoadStats | null;
  elapsedMs: number;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  if (!open) return null;
  const secs = Math.max(0, elapsedMs / 1000);
  const rate =
    stats?.bytes != null && secs > 0
      ? `${formatSize(stats.bytes / secs)}/s`
      : "—";
  return (
    <div
      id="qz-load-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-dialog-title"
    >
      <div
        id="qz-load-backdrop"
        className="qz-dialog-backdrop animate-qz-fade absolute inset-0"
        aria-hidden
      />
      <div
        id="qz-load-card"
        className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0.5)]"
      >
        <span
          id="qz-load-icon"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]"
        >
          <FolderOpen
            size={24}
            aria-hidden
            className="text-[var(--qz-primary)]"
          />
        </span>
        <h2
          id="load-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("loading.title")}
        </h2>
        <p className="mt-1 text-[13px] break-all text-[var(--qz-muted)]">
          {t(phase === "listing" ? "loading.listing" : "loading.details")}
        </p>
        <p className="mt-1 truncate text-[12px] text-[var(--qz-faint)]">
          {archive}
        </p>
        <div id="qz-load-progress" className="mt-4">
          <div
            id="qz-load-progressbar"
            className="h-2 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
            role="progressbar"
            aria-label={t("loading.progress")}
          >
            <div
              id="qz-load-progress-fill"
              className="animate-qz-slide h-full w-1/4 rounded-full bg-[var(--qz-primary)]"
            />
          </div>
        </div>
        <div
          id="qz-load-stats"
          className="mt-4 flex flex-col gap-1.5 text-left"
        >
          <Stat
            id="qz-load-stat-entries"
            label={t("loading.entries")}
            value={stats ? formatCount(stats.entries) : "—"}
          />
          <Stat
            id="qz-load-stat-data"
            label={t("loading.dataRead")}
            value={stats?.bytes != null ? formatSize(stats.bytes) : "—"}
          />
          <Stat
            id="qz-load-stat-elapsed"
            label={t("loading.elapsed")}
            value={`${Math.floor(secs)} s`}
          />
          <Stat id="qz-load-stat-rate" label={t("loading.rate")} value={rate} />
        </div>
        <div
          id="qz-load-actions"
          className="mt-5 flex items-center justify-center"
        >
          <Button id="qz-load-cancel" variant="secondary" onClick={onCancel}>
            <X size={14} aria-hidden />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
