import { invoke, Channel } from "@tauri-apps/api/core";
import { Check, ChevronDown, Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/LanguageContext";

const ALGOS = [
  { id: "md5", label: "MD5" },
  { id: "sha1", label: "SHA-1" },
  { id: "sha256", label: "SHA-256" },
  { id: "sha512", label: "SHA-512" },
] as const;

type AlgoId = (typeof ALGOS)[number]["id"];

type Phase =
  | { name: "idle" }
  | { name: "running"; pct: number }
  | { name: "done"; digest: string }
  | { name: "cancelled" }
  | { name: "error"; message: string };

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeHash(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

/// Checksum calculator popup: pick MD5/SHA-1/SHA-256/SHA-512, optionally
/// paste an expected hash, and calculate with a live progress bar. Cancel
/// stops the calculation but keeps the popup open; only Close dismisses it.
/// Backdrop clicks never dismiss it.
export default function ChecksumDialog({
  open,
  archive,
  onClose,
}: {
  open: boolean;
  archive: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [algo, setAlgo] = useState<AlgoId>("sha256");
  const [expected, setExpected] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const cancelRef = useRef(false);
  const menuRootRef = useRef<HTMLDivElement>(null);

  // Fresh run state per opening; algorithm + expected text are kept.
  useEffect(() => {
    if (!open) return;
    cancelRef.current = false;
    setPhase({ name: "idle" });
    setMenuOpen(false);
  }, [open]);

  // Dismiss the algorithm menu on outside click / Escape (menu only —
  // the dialog itself never closes this way).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Dialog-level Escape mirrors Close, except mid-calculation (Close is the
  // only way out then, and it cancels first).
  useEffect(() => {
    if (!open || phase.name === "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, phase.name, onClose]);

  if (!open) return null;
  const running = phase.name === "running";
  const algoLabel = ALGOS.find((a) => a.id === algo)?.label ?? algo;

  function start() {
    if (running) return;
    cancelRef.current = false;
    setPhase({ name: "running", pct: 0 });
    const channel = new Channel<number>((pct) => {
      setPhase((prev) =>
        prev.name === "running"
          ? { name: "running", pct: clampPct(pct) }
          : prev,
      );
    });
    invoke<string>("checksum_file", {
      path: archive,
      algorithm: algo,
      onProgress: channel,
    })
      .then((digest) => {
        if (!cancelRef.current) setPhase({ name: "done", digest });
      })
      .catch((e) => {
        if (cancelRef.current) {
          setPhase({ name: "cancelled" });
        } else {
          setPhase({
            name: "error",
            message: typeof e === "string" ? e : String(e),
          });
        }
      });
  }

  function cancel() {
    if (!running) return;
    cancelRef.current = true;
    // Fire-and-forget: the in-flight command surfaces the cancellation
    // as its rejection, which flips the dialog to the cancelled state.
    invoke("cancel_checksum").catch(() => {});
  }

  function close() {
    if (running) {
      cancelRef.current = true;
      invoke("cancel_checksum").catch(() => {});
    }
    onClose();
  }

  const trimmed = expected.trim();
  const verdict =
    phase.name === "done" && trimmed !== ""
      ? normalizeHash(phase.digest) === normalizeHash(trimmed)
        ? "match"
        : "mismatch"
      : null;

  return (
    <div
      id="qz-checksum-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checksum-dialog-title"
    >
      <div
        id="qz-checksum-backdrop"
        className="animate-qz-fade absolute inset-0 bg-black/25"
        aria-hidden
      />
      <div
        id="qz-checksum-card"
        className="qz-material-bar animate-qz-pop relative w-full max-w-md rounded-[16px] border border-[var(--qz-border)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <span
          id="qz-checksum-icon"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qz-primary-soft)]"
        >
          <Hash size={24} aria-hidden className="text-[var(--qz-primary)]" />
        </span>
        <h2
          id="checksum-dialog-title"
          className="mt-3 text-[16px] leading-6 font-semibold"
        >
          {t("checksum.title")}
        </h2>
        <p className="mt-1 text-[13px] break-all text-[var(--qz-muted)]">
          {archive}
        </p>

        <div id="qz-checksum-form" className="mt-4 space-y-3 text-left">
          <div id="qz-checksum-algo">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
              {t("checksum.algorithm")}
            </p>
            <div
              id="qz-checksum-algo-menu-root"
              ref={menuRootRef}
              className="relative mt-1"
            >
              <button
                id="qz-checksum-algo-btn"
                type="button"
                aria-label={t("checksum.algorithmList")}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                disabled={running}
                onClick={() => setMenuOpen((o) => !o)}
                className="qz-material-bar flex h-9 w-full cursor-pointer items-center justify-between rounded-[10px] border border-[var(--qz-border)] px-3 text-[13px] font-medium outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:cursor-default disabled:opacity-50 dark:hover:bg-white/10"
              >
                {algoLabel}
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`shrink-0 text-[var(--qz-faint)] transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {menuOpen && (
                <div
                  id="qz-checksum-algo-menu"
                  role="listbox"
                  aria-label={t("checksum.algorithmList")}
                  className="qz-material-bar animate-qz-pop absolute top-full right-0 left-0 z-10 mt-1 rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
                >
                  {ALGOS.map((option) => {
                    const selected = option.id === algo;
                    return (
                      <button
                        id={`qz-checksum-algo-opt-${option.id}`}
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setAlgo(option.id);
                          setMenuOpen(false);
                        }}
                        className={`flex h-8 w-full items-center justify-between gap-4 rounded-[7px] px-2 text-[13px] transition-colors ${
                          selected
                            ? "bg-[var(--qz-primary-soft)] font-semibold text-[var(--qz-primary)]"
                            : "text-[var(--qz-muted)] hover:text-[var(--qz-text)]"
                        }`}
                      >
                        {option.label}
                        {selected && <Check size={14} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div id="qz-checksum-expected-block">
            <label
              htmlFor="checksum-expected"
              className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase"
            >
              {t("checksum.expected")}
            </label>
            <input
              id="checksum-expected"
              type="text"
              value={expected}
              disabled={running}
              onChange={(e) => setExpected(e.target.value)}
              placeholder={t("checksum.expectedPlaceholder")}
              spellCheck={false}
              autoComplete="off"
              className="qz-material-bar mt-1 h-9 w-full rounded-[10px] border border-[var(--qz-border)] px-3 font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-[var(--qz-faint)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:opacity-50"
            />
          </div>
        </div>

        {phase.name === "running" && (
          <div id="qz-checksum-progress" className="mt-4">
            <div
              id="qz-checksum-progressbar"
              className="h-2 overflow-hidden rounded-full bg-[var(--qz-surface-2)]"
              role="progressbar"
              aria-label={t("checksum.progress")}
              aria-valuenow={phase.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                id="qz-checksum-progress-fill"
                className="h-full rounded-full bg-[var(--qz-primary)] transition-[width] duration-200"
                style={{ width: `${phase.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[12px] text-[var(--qz-faint)] tabular-nums">
              {t("checksum.calculating")} {phase.pct}%
            </p>
          </div>
        )}

        {phase.name === "done" && (
          <div
            id="qz-checksum-result"
            className="mt-4 rounded-[10px] border border-[var(--qz-border)] bg-[var(--qz-surface-2)] p-3 text-left"
          >
            <p className="text-[11px] font-semibold tracking-[0.06em] text-[var(--qz-faint)] uppercase">
              {t("checksum.computed", { algo: algoLabel })}
            </p>
            <p className="mt-1 font-mono text-[12px] break-all select-all">
              {phase.digest}
            </p>
            {verdict && (
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  verdict === "match"
                    ? "bg-[var(--qz-success-soft)] text-[var(--qz-success)]"
                    : "bg-[var(--qz-danger-soft)] text-[var(--qz-danger)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    verdict === "match"
                      ? "bg-[var(--qz-success)]"
                      : "bg-[var(--qz-danger)]"
                  }`}
                />
                {verdict === "match"
                  ? t("checksum.match")
                  : t("checksum.mismatch")}
              </p>
            )}
          </div>
        )}

        {phase.name === "cancelled" && (
          <p
            role="status"
            className="mt-4 text-[13px] text-[var(--qz-warning)]"
          >
            {t("checksum.cancelled")}
          </p>
        )}
        {phase.name === "error" && (
          <p
            role="alert"
            className="mt-4 text-[13px] break-all text-[var(--qz-danger)]"
          >
            {phase.message}
          </p>
        )}

        {/* Variants never change with phase: Calculate stays primary,
            Cancel/Close stay secondary — no color flips after a run. */}
        <div
          id="qz-checksum-actions"
          className="mt-5 flex items-center justify-center gap-2"
        >
          {running ? (
            <Button
              id="qz-checksum-cancel"
              variant="secondary"
              onClick={cancel}
            >
              {t("common.cancel")}
            </Button>
          ) : (
            <Button
              id="qz-checksum-calculate"
              onClick={start}
              autoFocus={phase.name === "idle"}
            >
              {t("checksum.calculate")}
            </Button>
          )}
          <Button id="qz-checksum-close" variant="secondary" onClick={close}>
            {t("checksum.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
