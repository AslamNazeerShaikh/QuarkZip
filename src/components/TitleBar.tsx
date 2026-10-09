import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, FolderOpen, Minus, Square, X } from "lucide-react";
import type { MouseEvent } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface TitleBarProps {
  archive: string | null;
  /// macOS overlay bar (traffic lights float over the webview).
  hidden?: boolean;
  /// Owned by the parent (it also drives the flush maximized layout).
  maximized: boolean;
  /// Opens another archive: shown only once an archive is open (mac
  /// right, Linux left), title always centered. Hidden on the empty
  /// state — the card's own CTA owns opening there.
  onOpen: () => void;
  openDisabled?: boolean;
}

/// Window title: `QuarkZip | <full path` with the file name always
/// surviving — the directory portion takes the middle ellipsis
/// (`…/photo.zip`, never `…/pho`). Short titles sit centered; long ones
/// fill every free pixel (pure flex + truncate, so window resizes reflow
/// it live). Full path on hover. A small italic read-only warning rides
/// below the title: archives open for listing + extraction only, never
/// modification.
function ArchiveTitle({ archive }: { archive: string }) {
  const { t } = useLanguage();
  const m = archive.match(/^(.*[/\\])([^/\\]+)$/);
  const dir = m ? m[1] : archive;
  const file = m ? m[2] : "";
  return (
    <span
      id="qz-titlebar-archive-title"
      className="flex max-w-full min-w-0 flex-col items-center"
      title={archive}
    >
      {/* leading-[1.2]: the two-line block must fit the 36px bar content
          box (px text vs rem box — at the 13px root the box is 29.25px). */}
      <span className="flex min-w-0 items-center justify-center leading-[1.2]">
        <span className="shrink-0 font-semibold">QuarkZip |&nbsp;</span>
        {file ? (
          <>
            <span
              id="qz-titlebar-archive-dir"
              className="truncate text-[var(--qz-glass-muted)]"
            >
              {dir}
            </span>
            <span
              id="qz-titlebar-archive-file"
              className="shrink-0 text-[var(--qz-glass-muted)]"
            >
              {file}
            </span>
          </>
        ) : (
          <span
            id="qz-titlebar-archive-dir"
            className="truncate text-[var(--qz-glass-muted)]"
          >
            {dir}
          </span>
        )}
      </span>
      <span className="mt-0.5 max-w-full truncate text-[10px] leading-none italic text-[var(--qz-glass-muted)]">
        {t("titlebar.readonlyHint")}
      </span>
    </span>
  );
}

/// Linux twin of the split above in window-chrome tokens (glass tokens are
/// mac-strip only — everywhere else the title sits on theme surfaces).
function ArchiveTitleThemed({ archive }: { archive: string }) {
  const { t } = useLanguage();
  const m = archive.match(/^(.*[/\\])([^/\\]+)$/);
  const dir = m ? m[1] : archive;
  const file = m ? m[2] : "";
  return (
    <span
      id="qz-titlebar-archive-title-themed"
      className="flex max-w-full min-w-0 flex-col items-center"
      title={archive}
    >
      <span className="flex min-w-0 items-center justify-center leading-[1.2]">
        <span className="shrink-0 font-semibold">QuarkZip |&nbsp;</span>
        {file ? (
          <>
            <span
              id="qz-titlebar-archive-dir-themed"
              className="truncate text-[var(--qz-muted)]"
            >
              {dir}
            </span>
            <span
              id="qz-titlebar-archive-file-themed"
              className="shrink-0 text-[var(--qz-muted)]"
            >
              {file}
            </span>
          </>
        ) : (
          <span
            id="qz-titlebar-archive-dir-themed"
            className="truncate text-[var(--qz-muted)]"
          >
            {dir}
          </span>
        )}
      </span>
      <span className="mt-0.5 max-w-full truncate text-[10px] leading-none italic text-[var(--qz-muted)]">
        {t("titlebar.readonlyHint")}
      </span>
    </span>
  );
}

/// Custom client-side title bar for borderless windows (`decorations: false`).
/// Used on Linux (Fedora/KDE) where the native title bar is disabled, so the
/// window gets rounded corners + its own minimize / maximize / close buttons.
/// The bar itself is the drag region; the buttons opt out of dragging.
/// On macOS (`hidden`) the window uses an overlay title bar: traffic lights
/// float over the webview, so this renders a slim drag strip with a left
/// inset clearing the lights — no window buttons, no native title.
///
/// The mac title is absolutely centered (siblings are asymmetric — Open on
/// the right, void on the left — and the asymmetric container padding would
/// otherwise push it ~24px right of true center). Linux keeps the symmetric
/// 1fr-auto-1fr grid, which centers on its own. Open appears only with an
/// archive open, on both bars.
export default function TitleBar({
  archive,
  hidden,
  maximized,
  onOpen,
  openDisabled = false,
}: TitleBarProps) {
  const { t } = useLanguage();
  // Yellow-tinted shell like every other action (opaque-safe on glass):
  // material tint, 10px radius, border, card shadow. The label uses the
  // theme text, not the glass tokens: the tint shell is a surface (like
  // every other button), so dark-mode white text applies — glass-dark
  // text would stay black on the dark tint.
  const openClass =
    "qz-tint-yellow flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--qz-border)] px-3 text-[13px] font-medium whitespace-nowrap text-[var(--qz-text)] shadow-[var(--qz-shadow-card)] transition-all duration-150 outline-none hover:opacity-90 motion-safe:active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:pointer-events-none disabled:opacity-50";
  if (hidden) {
    // Overlay strip: with an archive the title claims every pixel past
    // the 76px light inset; empty it falls back to the symmetric inset
    // so bare "QuarkZip" stays exactly centered. The right inset matches
    // the content column (`px-7`) so Open's right edge lands on the same
    // vertical line as the overview card's right edge. The strip runs
    // h-23 (92px): `pt-7`/`pb-7` air around the h-9 Open button (28px
    // above to the window edge, 28px below to the card — the footer's
    // equal-air treatment), which also drops the details below.
    // The title block is absolutely centered: the side cells are
    // asymmetric (button right, void left) and the container padding is
    // asymmetric too (76px vs 28px), so any in-flow centering lands ~24px
    // right of true center. The overlay spans the full bar width and
    // centers its child; the child caps at the free space (76px lights
    // + ~170px button zone) and middle-truncates, growing and shrinking
    // live with the window. Short titles hit true window center.
    return (
      <div
        data-tauri-drag-region
        onMouseDown={(e) => {
          // Drag denied/unavailable: silently no-op, never reject.
          if (e.button === 0) void invoke("drag_window").catch(() => {});
        }}
        data-testid="mac-titlebar"
        id="qz-titlebar-mac"
        className={`relative flex h-23 shrink-0 cursor-default items-center pt-7 pb-7 select-none ${
          archive ? "pr-7 pl-[76px]" : "px-[76px]"
        }`}
      >
        {archive ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                id="qz-titlebar-mac-title"
                className="min-w-0 max-w-[calc(100%-246px)] truncate px-2 text-center text-[13px] text-[var(--qz-glass-text)]"
              >
                <ArchiveTitle archive={archive} />
              </div>
            </div>
            <div
              id="qz-titlebar-mac-actions"
              className="ml-auto flex min-w-0 items-center justify-end"
            >
              <button
                id="qz-titlebar-open"
                type="button"
                onMouseDown={stopDrag}
                onClick={onOpen}
                disabled={openDisabled}
                aria-label={t("app.openNew")}
                title={t("app.openNew")}
                className={openClass}
              >
                <FolderOpen size={14} aria-hidden />
                {t("app.openNew")}
              </button>
            </div>
          </>
        ) : (
          <span className="min-w-0 flex-1 px-2 text-center text-[13px] text-[var(--qz-glass-text)]">
            <span className="font-semibold">QuarkZip</span>
          </span>
        )}
      </div>
    );
  }

  async function toggleMaximize(): Promise<void> {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      // Surface IPC denials (e.g. missing capability permissions) instead
      // of failing silently; harmless outside Tauri (tests, browser).
      console.error("toggleMaximize failed", e);
    }
  }

  async function minimize(): Promise<void> {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error("minimize failed", e);
    }
  }

  async function close(): Promise<void> {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("close failed", e);
    }
  }

  // Keep clicks on the buttons from starting a native window drag.
  function stopDrag(e: MouseEvent) {
    e.stopPropagation();
  }

  const btn =
    "flex h-9 w-11 items-center justify-center rounded-md text-[var(--qz-muted)] transition-all duration-150 hover:bg-black/5 hover:text-[var(--qz-text)] motion-safe:active:scale-[0.97] dark:hover:bg-white/10";

  return (
    <header
      id="qz-titlebar-linux"
      data-tauri-drag-region
      onMouseDown={(e) => {
        // Drag denied/unavailable: silently no-op, never reject.
        if (e.button === 0) void invoke("drag_window").catch(() => {});
      }}
      onDoubleClick={() => void toggleMaximize()}
      // Horizontal insets match the content column (`px-7`): Open's left
      // edge lands on the card's left edge, controls on its right edge.
      // h-23 like the mac strip: `pt-7`/`pb-7` air around the h-9 row
      // (28px to the window edge above, 28px to the card below).
      className="grid h-23 shrink-0 cursor-default grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center px-7 pt-7 pb-7 select-none"
    >
      {/* Left: Open sits here on Linux (window controls own the right);
          the app mark rides along so the centered title stays balanced. */}
      <div id="qz-titlebar-left" className="flex min-w-0 items-center gap-2">
        {archive && (
          <button
            id="qz-titlebar-open"
            type="button"
            onMouseDown={stopDrag}
            onClick={onOpen}
            disabled={openDisabled}
            aria-label={t("app.openNew")}
            title={t("app.openNew")}
            className={openClass}
          >
            <FolderOpen size={14} aria-hidden />
            {t("app.openNew")}
          </button>
        )}
        <span
          id="qz-titlebar-mark"
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--qz-primary)]"
        />
      </div>

      {/* Centered window title, middle-ellipsis on overflow. */}
      <span
        id="qz-titlebar-title"
        className="max-w-full min-w-0 px-2 text-center text-[13px]"
      >
        {archive ? (
          <ArchiveTitleThemed archive={archive} />
        ) : (
          <span className="font-semibold">QuarkZip</span>
        )}
      </span>

      {/* Right: custom window controls (KDE right-side convention). */}
      <div
        id="qz-titlebar-controls"
        className="flex items-center justify-end gap-1"
      >
        <button
          id="qz-titlebar-minimize"
          type="button"
          aria-label={t("titlebar.minimize")}
          title={t("titlebar.minimize")}
          onMouseDown={stopDrag}
          onClick={() => void minimize()}
          className={btn}
        >
          <Minus size={15} aria-hidden />
        </button>
        <button
          id="qz-titlebar-maximize"
          type="button"
          aria-label={
            maximized ? t("titlebar.restore") : t("titlebar.maximize")
          }
          title={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onMouseDown={stopDrag}
          onClick={() => void toggleMaximize()}
          className={btn}
        >
          {maximized ? (
            <Copy size={13} aria-hidden />
          ) : (
            <Square size={13} aria-hidden />
          )}
        </button>
        <button
          id="qz-titlebar-close"
          type="button"
          aria-label={t("titlebar.close")}
          title={t("titlebar.close")}
          onMouseDown={stopDrag}
          onClick={() => void close()}
          className="flex h-9 w-11 items-center justify-center rounded-md text-[var(--qz-muted)] transition-all duration-150 hover:bg-[#e81123] hover:text-white motion-safe:active:scale-[0.97]"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </header>
  );
}
