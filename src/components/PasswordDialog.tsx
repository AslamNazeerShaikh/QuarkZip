import { invoke, Channel } from "@tauri-apps/api/core";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";
import { isPasswordError } from "../lib/password";

type Phase =
  | { name: "idle" }
  | { name: "checking"; pct: number }
  | { name: "verified" }
  | { name: "wrong" }
  | { name: "error"; message: string };

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/// Password gate for encrypted archives: opening (or drag-dropping) a
/// password-protected archive lands here instead of failing — and so do
/// Test/Extract runs that hit a password error, which the gate retries
/// after verifying. Check verifies the password with `7zz t` (live
/// progress); a match animates a success check and reveals the accept
/// button (Open / Extract / Test per caller), a miss shakes the input and
/// keeps Check/Cancel. Cancel dismisses with the app state untouched.
/// Backdrop clicks never dismiss it — Cancel (or Esc) only.
export default function PasswordDialog({
  open,
  archive,
  acceptLabel,
  onAccept,
  onCancel,
}: {
  open: boolean;
  archive: string;
  acceptLabel: string;
  onAccept: (path: string, password: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fresh prompt per opening; focus the input for immediate typing.
  useEffect(() => {
    if (!open) return;
    setPassword("");
    setShow(false);
    setPhase({ name: "idle" });
    setAttempts(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Esc mirrors Cancel. Inert while checking (Cancel is disabled then —
  // the verify call is seconds away from a verdict either way).
  const phaseName = phase.name;
  useEffect(() => {
    if (!open || phaseName === "checking") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, phaseName, onCancel]);

  if (!open) return null;
  const checking = phase.name === "checking";
  const verified = phase.name === "verified";
  const locked = checking || verified;

  function check() {
    const pw = password;
    if (pw === "" || checking || verified) return;
    setPhase({ name: "checking", pct: 0 });
    const channel = new Channel<number>((pct) => {
      const clamped = clampPct(pct);
      setPhase((prev) =>
        prev.name === "checking" ? { name: "checking", pct: clamped } : prev,
      );
    });
    invoke<string>("test_archive", {
      path: archive,
      password: pw,
      onProgress: channel,
    })
      .then(() => {
        setPhase({ name: "verified" });
      })
      .catch((e) => {
        if (isPasswordError(typeof e === "string" ? e : String(e))) {
          setAttempts((n) => n + 1);
          setPhase({ name: "wrong" });
          inputRef.current?.focus();
          inputRef.current?.select();
        } else {
          setPhase({
            name: "error",
            message: typeof e === "string" ? e : String(e),
          });
        }
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-dialog-title"
    >
      <div
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <span
          key={phase.name}
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            verified
              ? "bg-[var(--qz-success-soft)]"
              : phase.name === "wrong" || phase.name === "error"
                ? "bg-[var(--qz-danger-soft)]"
                : "bg-[var(--qz-primary-soft)]"
          } ${verified ? "animate-qz-success" : ""}`}
        >
          {verified ? (
            <CheckCircle2
              size={24}
              aria-hidden
              className="text-[var(--qz-success)]"
            />
          ) : phase.name === "wrong" || phase.name === "error" ? (
            <XCircle
              size={24}
              aria-hidden
              className="text-[var(--qz-danger)]"
            />
          ) : (
            <LockKeyhole
              size={24}
              aria-hidden
              className="text-[var(--qz-primary)]"
            />
          )}
        </span>
        <h2
          id="password-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("password.title")}
        </h2>
        <p className="mt-1 text-[13px] break-all text-[var(--qz-muted)]">
          {verified ? t("password.verified") : archive}
        </p>

        {!verified && (
          <form
            className="mt-4 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <label
              htmlFor="archive-password"
              className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase"
            >
              {t("password.label")}
            </label>
            <div
              key={attempts}
              className={`qz-material-bar mt-1 flex h-9 items-center rounded-[10px] border outline-none transition-colors focus-within:ring-2 focus-within:ring-[var(--qz-primary)]/40 ${
                phase.name === "wrong"
                  ? "animate-qz-shake border-[var(--qz-danger)]"
                  : "border-[var(--qz-border)]"
              }`}
            >
              <input
                ref={inputRef}
                id="archive-password"
                type={show ? "text" : "password"}
                value={password}
                disabled={locked}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password.placeholder")}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none placeholder:text-[var(--qz-faint)] disabled:opacity-50"
              />
              <button
                type="button"
                aria-label={show ? t("password.hide") : t("password.show")}
                title={show ? t("password.hide") : t("password.show")}
                disabled={locked}
                onClick={() => setShow((s) => !s)}
                className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--qz-muted)] transition-colors hover:text-[var(--qz-text)] disabled:opacity-50"
              >
                {show ? (
                  <EyeOff size={16} aria-hidden />
                ) : (
                  <Eye size={16} aria-hidden />
                )}
              </button>
            </div>
            {phase.name === "wrong" && (
              <p
                role="alert"
                className="mt-2 text-[13px] text-[var(--qz-danger)]"
              >
                {t("password.wrong")}
              </p>
            )}
            {phase.name === "error" && (
              <p
                role="alert"
                className="mt-2 text-[13px] break-all text-[var(--qz-danger)]"
              >
                {phase.message}
              </p>
            )}
            {checking && (
              <div className="mt-3">
                <div
                  className="h-2 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
                  role="progressbar"
                  aria-label={t("password.progress")}
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
                  {t("password.checking")} {phase.pct}%
                </p>
              </div>
            )}
          </form>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          {verified ? (
            <Button onClick={() => onAccept(archive, password)} autoFocus>
              {acceptLabel}
            </Button>
          ) : (
            <Button
              onClick={check}
              disabled={password === "" || locked}
              autoFocus={!checking}
            >
              {t("password.check")}
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel} disabled={checking}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
