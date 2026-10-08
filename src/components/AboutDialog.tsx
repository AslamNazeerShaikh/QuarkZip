import { Info } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { APP_NAME, type AppInfo } from "../lib/appInfo";
import { useLanguage } from "../i18n/LanguageContext";

/// About popup, mirroring the extract dialogs: dimmed backdrop, surface card
/// with a big centered icon, an info grid, the 7-Zip attribution paragraph,
/// and a single OK action. Esc and backdrop click also dismiss.
export default function AboutDialog({
  open,
  info,
  onOk,
}: {
  open: boolean;
  info: AppInfo | null;
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

  if (!open) return null;

  const { t } = useLanguage();

  const rows: Array<[string, string]> = [
    [t("about.appName"), APP_NAME],
    [t("about.version"), info?.version ?? "…"],
    [t("about.releaseDate"), info?.releaseDate ?? "…"],
    [t("about.commitId"), info?.commitId ?? "…"],
    [t("about.os"), info?.os ?? "…"],
    [t("about.arch"), info?.arch ?? "…"],
  ];

  return (
    <div
      id="qz-about-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
    >
      {/* Backdrop is inert: the popup closes only via OK (or Esc),
          never by clicking outside. */}
      <div
        id="qz-about-backdrop"
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div
        id="qz-about-card"
        className="qz-material-bar animate-qz-pop relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-[var(--qz-border)] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <span
          id="qz-about-icon"
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]"
        >
          <Info size={20} aria-hidden className="text-[var(--qz-primary)]" />
        </span>
        <h2
          id="about-dialog-title"
          className="mt-2 text-[16px] leading-6 font-semibold"
        >
          {t("about.title", { app: APP_NAME })}
        </h2>
        <dl id="qz-about-list" className="mt-3 space-y-1.5 text-left">
          {rows.map(([label, value], index) => (
            <div
              id={`qz-about-row-${index}`}
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--qz-border)] pb-1.5 last:border-0 last:pb-0"
            >
              <dt className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
                {label}
              </dt>
              <dd className="min-w-0 truncate text-[13px] font-medium break-all">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center text-[12px] leading-5 text-[var(--qz-muted)]">
          {t("about.licenseA", { app: APP_NAME })}
          <a
            href="https://www.7-zip.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("about.licenseLink")}
          </a>
          {t("about.licenseB")}
        </p>
        <p className="mt-3 text-[13px]" aria-label={t("about.madeWithLabel")}>
          {t("about.madeWith")}
        </p>
        <div
          id="qz-about-actions"
          className="mt-4 flex items-center justify-center"
        >
          <Button id="qz-about-ok" onClick={onOk} autoFocus>
            {t("common.ok")}
          </Button>
        </div>
      </div>
    </div>
  );
}
