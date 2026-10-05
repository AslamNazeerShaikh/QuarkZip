import { Info } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./components/ui/button";
import { APP_NAME, type AppInfo } from "./appInfo";

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

  const rows: Array<[string, string]> = [
    ["App Name", APP_NAME],
    ["Current Version", info?.version ?? "…"],
    ["Release Date", info?.releaseDate ?? "…"],
    ["Commit ID", info?.commitId ?? "…"],
    ["OS", info?.os ?? "…"],
    ["Architecture", info?.arch ?? "…"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
    >
      <div
        className="animate-qz-fade absolute inset-0 bg-black/25"
        onClick={onOk}
        aria-hidden
      />
      <div className="animate-qz-pop relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-[var(--qz-border)] bg-[var(--qz-surface)] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]">
          <Info size={20} aria-hidden className="text-[var(--qz-primary)]" />
        </span>
        <h2
          id="about-dialog-title"
          className="mt-2 text-[16px] leading-6 font-semibold"
        >
          About {APP_NAME}
        </h2>
        <dl className="mt-3 space-y-1.5 text-left">
          {rows.map(([label, value]) => (
            <div
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
          {APP_NAME}&rsquo;s own interface is open-source. Archiving is powered
          by the 7-Zip command-line binary (7zz), Copyright &copy; 1999&ndash;2025
          Igor Pavlov, licensed mainly under the GNU LGPL v2.1 or later (see{" "}
          <a
            href="https://www.7-zip.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            7-zip.org
          </a>
          ). The pinned 7-Zip 26.03 sidecar ships as-is from the upstream
          release and is free for any use, including commercial.
        </p>
        <p className="mt-3 text-[13px]" aria-label="Made with love in India">
          Made with ❤️ in 🇮🇳
        </p>
        <div className="mt-4 flex items-center justify-center">
          <Button onClick={onOk} autoFocus>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
