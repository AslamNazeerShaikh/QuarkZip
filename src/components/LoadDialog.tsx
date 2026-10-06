import { FolderOpen, X } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCount, formatSize } from "../lib/format";

export interface LoadStats {
  bytes: number;
  entries: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-[var(--qz-text)] tabular-nums">
        {value}
      </p>
    </div>
  );
}

/// Opening-archive progress popup. `7zz l` reports no percent, so the bar
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
  const rate = stats && secs > 0 ? `${formatSize(stats.bytes / secs)}/s` : "—";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-dialog-title"
    >
      <div
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div className="animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] bg-[var(--qz-surface)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0.5)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]">
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
        <div className="mt-4">
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
            role="progressbar"
            aria-label={t("loading.progress")}
          >
            <div className="animate-qz-slide h-full w-1/4 rounded-full bg-[var(--qz-primary)]" />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5 text-left">
          <Stat
            label={t("loading.entries")}
            value={stats ? formatCount(stats.entries) : "—"}
          />
          <Stat
            label={t("loading.dataRead")}
            value={stats ? formatSize(stats.bytes) : "—"}
          />
          <Stat label={t("loading.elapsed")} value={`${Math.floor(secs)} s`} />
          <Stat label={t("loading.rate")} value={rate} />
        </div>
        <div className="mt-5 flex items-center justify-center">
          <Button variant="secondary" onClick={onCancel}>
            <X size={14} aria-hidden />
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
