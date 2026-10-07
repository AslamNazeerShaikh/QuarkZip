import { invoke, Channel } from "@tauri-apps/api/core";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import { isPasswordError } from "../lib/password";

type Phase =
  | { running: true; pct: number }
  | { running: false; ok: boolean; message: string };

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/// Archive integrity test popup (`7zz t`, like AkiZip's Test button).
/// Starts automatically on open: live determinate progress bar while 7zz
/// runs, then a pass/fail result with a single OK action. Backdrop clicks
/// never dismiss it — only OK (enabled once the test finishes).
export default function TestDialog({
  open,
  archive,
  password = null,
  onOk,
  onPasswordError,
}: {
  open: boolean;
  archive: string;
  password?: string | null;
  onOk: () => void;
  /// Called instead of showing a result when the run fails for lack of a
  /// password (and none was supplied) — the caller swaps in the gate.
  onPasswordError?: () => void;
}) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>({ running: true, pct: 0 });

  useEffect(() => {
    if (!open) return;
    setPhase({ running: true, pct: 0 });
    let alive = true;
    const channel = new Channel<number>((pct) => {
      if (alive) setPhase({ running: true, pct: clampPct(pct) });
    });
    invoke<string>("test_archive", {
      path: archive,
      password,
      onProgress: channel,
    })
      .then(() => {
        if (alive)
          setPhase({ running: false, ok: true, message: t("test.pass") });
      })
      .catch((e) => {
        if (!alive) return;
        const message = typeof e === "string" ? e : String(e);
        if (password === null && isPasswordError(message) && onPasswordError) {
          onPasswordError();
          return;
        }
        setPhase({ running: false, ok: false, message });
      });
    return () => {
      alive = false;
    };
    // Re-run once per opening (and per password — unlocking reuses it);
    // `t` is stable per language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, archive, password]);

  useEffect(() => {
    if (!open || phase.running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOk();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, phase.running, onOk]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-dialog-title"
    >
      <div
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            phase.running
              ? "bg-[var(--qz-primary-soft)]"
              : phase.ok
                ? "bg-[var(--qz-success-soft)]"
                : "bg-[var(--qz-danger-soft)]"
          }`}
        >
          {phase.running ? (
            <ShieldCheck
              size={24}
              aria-hidden
              className="text-[var(--qz-primary)]"
            />
          ) : phase.ok ? (
            <CheckCircle2
              size={24}
              aria-hidden
              className="text-[var(--qz-success)]"
            />
          ) : (
            <XCircle
              size={24}
              aria-hidden
              className="text-[var(--qz-danger)]"
            />
          )}
        </span>
        <h2
          id="test-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("test.title")}
        </h2>
        <p className="mt-1 text-[13px] break-all text-[var(--qz-muted)]">
          {phase.running ? t("test.testing", { name: archive }) : phase.message}
        </p>
        {phase.running && (
          <div className="mt-4">
            <div
              className="h-2 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
              role="progressbar"
              aria-label={t("test.progress")}
              aria-valuenow={phase.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[var(--qz-primary)] transition-[width] duration-200"
                style={{ width: `${phase.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[12px] text-[var(--qz-faint)] tabular-nums">
              {phase.pct}%
            </p>
          </div>
        )}
        <div className="mt-5 flex items-center justify-center">
          <Button
            onClick={onOk}
            disabled={phase.running}
            autoFocus={!phase.running}
          >
            {t("common.ok")}
          </Button>
        </div>
      </div>
    </div>
  );
}
