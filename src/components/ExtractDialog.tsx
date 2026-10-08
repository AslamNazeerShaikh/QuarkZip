import { invoke } from "@tauri-apps/api/core";
import {
  CalendarClock,
  Check,
  Download,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCount } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";
import {
  appendDateStamp,
  defaultFolderName,
  joinDest,
  utf8Length,
  validateFolderName,
  type FolderNameError,
} from "../lib/extractFolder";
import { Button } from "./ui/button";

function count(value: number): string {
  return formatCount(value);
}

export type ExtractMode = "selected" | "all" | "empty";

/// Extract confirmation in three modes: `selected` (K of N, ListChecks
/// icon), `all` (N files, Download icon), `empty` (nothing checked —
/// offers Extract All or Cancel, warning icon). Every mode carries the
/// optional subfolder section: unchecked by default, checked reveals a
/// name field prefilled with the archive basename (editable), validated
/// for APFS (UTF-8, ≤255 bytes, no `/ :` or controls, not `.`/`..`) with
/// a backend uniqueness check (`path_exists` on `dest/<name>`) so the run
/// never merges into a colliding folder. Proceed stays disabled until the
/// name is clean. Esc cancels. The backdrop never dismisses.
export default function ExtractDialog({
  open,
  mode,
  selected,
  total,
  dest,
  archivePath,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: ExtractMode;
  selected: number;
  total: number;
  dest: string;
  archivePath: string;
  onCancel: () => void;
  onConfirm: (finalDest: string) => void;
}) {
  const { t } = useLanguage();
  const [createFolder, setCreateFolder] = useState(false);
  const [folderName, setFolderName] = useState(() =>
    defaultFolderName(archivePath),
  );
  // `null` = free/unknown-yet; boolean only after a completed check.
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const checkId = useRef(0);

  // Fresh open (or archive): folder off, name back to the basename.
  useEffect(() => {
    if (!open) return;
    setCreateFolder(false);
    setFolderName(defaultFolderName(archivePath));
    setExists(null);
    setChecking(false);
  }, [open, archivePath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const syntaxError: FolderNameError | null = createFolder
    ? validateFolderName(folderName)
    : null;
  const normalized = folderName.normalize("NFC");

  // Uniqueness probe, debounced: one `metadata` call per settled name.
  // Stale responses lose to the latest request id; invoke failures (plain
  // browser runs) leave uniqueness unknown instead of blocking.
  useEffect(() => {
    if (!open || !createFolder || syntaxError) {
      setChecking(false);
      setExists(null);
      return;
    }
    const id = ++checkId.current;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void invoke<boolean>("path_exists", {
        path: joinDest(dest, normalized),
      })
        .then((taken) => {
          if (checkId.current === id) {
            setExists(taken);
            setChecking(false);
          }
        })
        .catch(() => {
          if (checkId.current === id) {
            setExists(null);
            setChecking(false);
          }
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, createFolder, syntaxError, dest, normalized]);

  if (!open) return null;

  const errorKey: FolderNameError | "exists" | null = createFolder
    ? (syntaxError ?? (exists ? "exists" : null))
    : null;
  const blocked =
    createFolder && (syntaxError !== null || exists === true || checking);
  const finalDest =
    createFolder && !syntaxError ? joinDest(dest, normalized) : dest;

  const title =
    mode === "all"
      ? t("extract.titleAll")
      : mode === "empty"
        ? t("extract.titleEmpty")
        : t("extract.titleSelected");
  const confirmLabel =
    mode === "empty" ? t("app.extractAll") : t("common.proceed");

  return (
    <div
      id="qz-extract-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extract-dialog-title"
    >
      {/* Backdrop is inert: popups close only via their buttons (or Esc),
          never by clicking outside. */}
      <div
        id="qz-extract-backdrop"
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div
        id="qz-extract-card"
        className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        {mode === "selected" ? (
          <span
            id="qz-extract-icon"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]"
          >
            <ListChecks
              size={24}
              aria-hidden
              className="text-[var(--qz-primary)]"
            />
          </span>
        ) : mode === "all" ? (
          <span
            id="qz-extract-icon"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-info-soft)]"
          >
            <Download size={24} aria-hidden className="text-[var(--qz-info)]" />
          </span>
        ) : (
          <span
            id="qz-extract-icon"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-warning-soft)]"
          >
            <TriangleAlert
              size={24}
              aria-hidden
              className="text-[var(--qz-warning)]"
            />
          </span>
        )}
        <h2
          id="extract-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
          {mode === "all" ? (
            <>{t("extract.allFiles", { total: count(total) })}</>
          ) : mode === "empty" ? (
            <>{t("extract.emptyMessage", { total: count(total) })}</>
          ) : (
            <>
              {t("extract.someFiles", {
                selected: count(selected),
                total: count(total),
              })}
            </>
          )}
        </p>
        <p className="mt-2 text-[13px] font-medium break-all">{finalDest}</p>
        {/* Subfolder section, centered like everything else in the card:
            checkbox row, name field, live byte budget, one-tap date-time
            suffix (`name_2026-10-08_14-30-05`); the final-path preview
            above shows the result. */}
        <div
          id="qz-extract-subfolder"
          className="mt-4 border-t border-[var(--qz-border)] pt-4 text-center"
        >
          <button
            id="qz-extract-folder-toggle"
            type="button"
            role="checkbox"
            aria-checked={createFolder}
            aria-label={t("extract.folderToggle")}
            onClick={() => setCreateFolder((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 outline-none"
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                createFolder
                  ? "border-transparent bg-[var(--qz-primary)]"
                  : "border-[var(--qz-border)] bg-transparent"
              }`}
            >
              {createFolder && (
                <Check
                  size={13}
                  strokeWidth={3}
                  className="text-[var(--qz-on-primary)]"
                />
              )}
            </span>
            <span className="text-[13px] font-medium text-[var(--qz-text)]">
              {t("extract.folderToggle")}
            </span>
          </button>
          {createFolder && (
            <div id="qz-extract-folder-field" className="mt-2.5">
              <label
                htmlFor="extract-folder-name"
                className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase"
              >
                {t("extract.folderLabel")}
              </label>
              <input
                id="extract-folder-name"
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t("extract.folderPlaceholder")}
                aria-invalid={errorKey !== null}
                aria-describedby={errorKey ? "extract-folder-error" : undefined}
                className="mt-1 h-9 w-full rounded-[9px] border border-[var(--qz-border)] bg-[var(--qz-surface)] px-3 text-center text-[13px] text-[var(--qz-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
              />
              <div
                id="qz-extract-folder-meta"
                className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
              >
                <span className="text-xs text-[var(--qz-faint)] tabular-nums">
                  {t("extract.folderLimit", {
                    used: String(utf8Length(folderName)),
                  })}
                </span>
                <Button
                  id="qz-extract-append-date"
                  variant="secondary"
                  size="bar"
                  onClick={() =>
                    setFolderName((cur) =>
                      appendDateStamp(
                        cur === "" ? defaultFolderName(archivePath) : cur,
                      ),
                    )
                  }
                  className="px-2 text-xs"
                >
                  <CalendarClock size={13} aria-hidden />
                  {t("extract.appendDate")}
                </Button>
              </div>
              {checking ? (
                <p className="mt-1.5 text-xs text-[var(--qz-faint)]">
                  {t("extract.folderChecking")}
                </p>
              ) : errorKey ? (
                <p
                  id="extract-folder-error"
                  role="alert"
                  className="mt-1.5 text-xs text-[var(--qz-danger)]"
                >
                  {errorKey === "empty" && t("extract.folderErrorEmpty")}
                  {errorKey === "too_long" && t("extract.folderErrorTooLong")}
                  {errorKey === "reserved" && t("extract.folderErrorReserved")}
                  {errorKey === "invalid_chars" &&
                    t("extract.folderErrorInvalidChars")}
                  {errorKey === "invalid_unicode" &&
                    t("extract.folderErrorInvalidUnicode")}
                  {errorKey === "exists" && t("extract.folderErrorExists")}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <div
          id="qz-extract-actions"
          className="mt-5 flex items-center justify-center gap-2"
        >
          <Button id="qz-extract-cancel" variant="warning" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            id="qz-extract-confirm"
            variant="accent"
            onClick={() => onConfirm(finalDest)}
            disabled={blocked}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
