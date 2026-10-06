import { Download } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./components/ui/button";
import { formatCount } from "./format";
import { useLanguage } from "./i18n/LanguageContext";

function count(value: number): string {
  return formatCount(value);
}

/// Centered extract confirmation: dimmed backdrop, white card with a big
/// centered icon, the destination, and the selected-of-total file count.
/// Cancel (orange) dismisses; Proceed (blue) runs the extraction. Esc also
/// cancels. The backdrop never dismisses — use the buttons.
export default function ExtractDialog({
  open,
  selected,
  total,
  dest,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  selected: number;
  total: number;
  dest: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const { t } = useLanguage();

  if (!open) return null;
  const all = selected === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extract-dialog-title"
    >
      {/* Backdrop is inert: popups close only via their buttons (or Esc),
          never by clicking outside. */}
      <div
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div className="animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] bg-[var(--qz-surface)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-info-soft)]">
          <Download size={24} aria-hidden className="text-[var(--qz-info)]" />
        </span>
        <h2
          id="extract-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("extract.title")}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--qz-muted)]">
          {all ? (
            <>{t("extract.allFiles", { total: count(total) })}</>
          ) : (
            <>
              {t("extract.someFiles", {
                selected: count(selected),
                total: count(total),
              })}
            </>
          )}
        </p>
        <p className="mt-2 text-[13px] font-medium break-all">{dest}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="warning" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="accent" onClick={onConfirm} autoFocus>
            {t("common.proceed")}
          </Button>
        </div>
      </div>
    </div>
  );
}
