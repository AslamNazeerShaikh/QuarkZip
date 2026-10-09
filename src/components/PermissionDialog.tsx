import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";

/// Permission-denied dialog: the backend hit EACCES/EPERM (TCC-protected
/// location, root-owned dir, read-only mount) during extract or test.
/// Names the blocked path, offers the Privacy Settings grant (Full Disk
/// Access pane) and — for extracts — picking a different folder instead
/// of failing. Same modal language as every dialog (frosted veil, inert
/// backdrop, Esc cancels).
export default function PermissionDialog({
  open,
  mode,
  path,
  onOpenSettings,
  onChooseFolder,
  onCancel,
}: {
  open: boolean;
  mode: "extract" | "test";
  path: string;
  onOpenSettings: () => void;
  onChooseFolder?: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      id="qz-permission-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-dialog-title"
    >
      <div
        id="qz-permission-backdrop"
        className="qz-dialog-backdrop animate-qz-fade absolute inset-0"
        aria-hidden
      />
      <div
        id="qz-permission-card"
        className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <span
          id="qz-permission-icon"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-warning-soft)]"
        >
          <ShieldAlert
            size={24}
            aria-hidden
            className="text-[var(--qz-warning)]"
          />
        </span>
        <h2
          id="permission-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("permission.title")}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
          {t("permission.message", { path })}
        </p>
        <p className="mt-2 text-[13px] font-medium break-all">{path}</p>
        <p className="mt-1 text-[12px] text-[var(--qz-faint)]">
          {t("permission.hint")}
        </p>
        <div
          id="qz-permission-actions"
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <Button
            id="qz-permission-cancel"
            variant="warning"
            onClick={onCancel}
            title={t("common.cancel")}
          >
            {t("common.cancel")}
          </Button>
          {mode === "extract" && onChooseFolder && (
            <Button
              id="qz-permission-folder"
              variant="secondary"
              onClick={onChooseFolder}
              title={t("permission.chooseFolder")}
            >
              {t("permission.chooseFolder")}
            </Button>
          )}
          <Button
            id="qz-permission-settings"
            variant="accent"
            onClick={onOpenSettings}
            autoFocus
            title={t("permission.openSettings")}
          >
            {t("permission.openSettings")}
          </Button>
        </div>
      </div>
    </div>
  );
}
