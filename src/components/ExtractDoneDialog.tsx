import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { CheckCircle2, FolderSearch, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { formatCount } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";

export type ExtractResult =
  | { ok: true; fileCount: number; dest: string }
  | { ok: false; message: string; dest: string };

/// Extraction result popup, mirroring the confirm dialog: frosted-glass backdrop,
/// white card with a big centered icon, and OK plus (on success) Reveal in
/// Finder actions — the webview cannot drag files out to Finder, so Reveal
/// is the one-click bridge (opens the destination in the native file
/// manager). Success shows the extracted file count and destination;
/// failure shows the error. Esc also dismisses. The backdrop never
/// dismisses — use the buttons.
export default function ExtractDoneDialog({
  open,
  result,
  onOk,
}: {
  open: boolean;
  result: ExtractResult;
  onOk: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOk();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOk]);

  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div
      id="qz-extract-done-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extract-done-title"
    >
      <div
        id="qz-extract-done-backdrop"
        className="qz-dialog-backdrop animate-qz-fade absolute inset-0"
        aria-hidden
      />
      <div
        id="qz-extract-done-card"
        className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        {result.ok ? (
          <>
            <span
              id="qz-extract-done-icon"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-success-soft)]"
            >
              <CheckCircle2
                size={24}
                aria-hidden
                className="text-[var(--qz-success)]"
              />
            </span>
            <h2
              id="extract-done-title"
              className="mt-3 text-[16px] leading-6 font-semibold"
            >
              {t("done.successTitle")}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
              {t("done.successFiles", { count: formatCount(result.fileCount) })}
            </p>
            <p className="mt-2 text-[13px] font-medium break-all">
              {result.dest}
            </p>
          </>
        ) : (
          <>
            <span
              id="qz-extract-done-icon"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-danger-soft)]"
            >
              <XCircle
                size={24}
                aria-hidden
                className="text-[var(--qz-danger)]"
              />
            </span>
            <h2
              id="extract-done-title"
              className="mt-3 text-[16px] leading-6 font-semibold"
            >
              {t("done.failTitle")}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
              {result.message}
            </p>
            <p className="mt-2 text-[13px] font-medium break-all">
              {result.dest}
            </p>
          </>
        )}
        <div
          id="qz-extract-done-actions"
          className="mt-5 flex items-center justify-center gap-2"
        >
          {result.ok && (
            <Button
              id="qz-extract-done-reveal"
              variant="secondary"
              onClick={() => void revealItemInDir(result.dest).catch(() => {})}
              title={t("done.revealInFinder")}
            >
              <FolderSearch size={14} aria-hidden />
              {t("done.revealInFinder")}
            </Button>
          )}
          <Button
            id="qz-extract-done-ok"
            onClick={onOk}
            autoFocus={!result.ok}
            title={t("common.ok")}
          >
            {t("common.ok")}
          </Button>
        </div>
      </div>
    </div>
  );
}
