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
  /// Opens the archive picker (moved here from the footer: mac right,
  /// Linux left, title always centered).
  onOpen: () => void;
  openDisabled?: boolean;
}

/// Custom client-side title bar for borderless windows (`decorations: false`).
/// Used on Linux (Fedora/KDE) where the native title bar is disabled, so the
/// window gets rounded corners + its own minimize / maximize / close buttons.
/// The bar itself is the drag region; the buttons opt out of dragging.
/// On macOS (`hidden`) the window uses an overlay title bar: traffic lights
/// float over the webview, so this renders a slim drag strip with a left
/// inset clearing the lights — no window buttons, no native title.
export default function TitleBar({
  archive,
  hidden,
  maximized,
  onOpen,
  openDisabled = false,
}: TitleBarProps) {
  const { t } = useLanguage();
  if (hidden) {
    // Overlay strip: grid keeps the title truly centered while Open sits
    // right. The left cell stays empty so the title never slides under the
    // floating traffic lights (x20); the glass strip uses glass tokens
    // (dark in both themes — the backdrop is wallpaper, not a surface).
    return (
      <div
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0) void invoke("drag_window");
        }}
        data-testid="mac-titlebar"
        className="grid h-12 shrink-0 cursor-default grid-cols-[1fr_auto_1fr] items-center px-4 select-none"
      >
        <div aria-hidden />
        <span className="max-w-[40vw] truncate px-2 text-center text-[13px] text-[var(--qz-glass-text)]">
          <span className="font-semibold">QuarkZip</span>
          {archive && (
            <span className="text-[var(--qz-glass-muted)]">
              {" "}
              | &quot;{t("titlebar.path", { path: archive })}&quot;
            </span>
          )}
        </span>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onMouseDown={stopDrag}
            onClick={onOpen}
            disabled={openDisabled}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-black/10 px-3 text-[13px] font-medium whitespace-nowrap text-[var(--qz-glass-text)] transition-colors outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <FolderOpen size={14} aria-hidden />
            {t("app.openNew")}
          </button>
        </div>
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
    "flex h-8 w-11 items-center justify-center rounded-md text-[var(--qz-muted)] transition-colors hover:bg-black/5 hover:text-[var(--qz-text)] dark:hover:bg-white/10";

  return (
    <header
      data-tauri-drag-region
      onMouseDown={(e) => {
        if (e.button === 0) void invoke("drag_window");
      }}
      onDoubleClick={() => void toggleMaximize()}
      className="grid h-12 shrink-0 cursor-default grid-cols-[1fr_auto_1fr] items-center pr-2 pl-4 select-none"
    >
      {/* Left: Open sits here on Linux (window controls own the right);
          the app mark rides along so the centered title stays balanced. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onMouseDown={stopDrag}
          onClick={onOpen}
          disabled={openDisabled}
          className="flex h-8 items-center gap-1.5 rounded-[9px] border border-[var(--qz-border)] px-3 text-[13px] font-medium whitespace-nowrap text-[var(--qz-text)] transition-colors outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/10"
        >
          <FolderOpen size={14} aria-hidden />
          {t("app.openNew")}
        </button>
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--qz-primary)]" />
      </div>

      {/* Centered window title, ellipsis on overflow. */}
      <span className="max-w-[52vw] truncate px-2 text-center text-[13px]">
        <span className="font-semibold">QuarkZip</span>
        {archive && (
          <span className="text-[var(--qz-muted)]">
            {" "}
            | &quot;{t("titlebar.path", { path: archive })}&quot;
          </span>
        )}
      </span>

      {/* Right: custom window controls (KDE right-side convention). */}
      <div className="flex items-center justify-end gap-1">
        <button
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
          type="button"
          aria-label={t("titlebar.close")}
          title={t("titlebar.close")}
          onMouseDown={stopDrag}
          onClick={() => void close()}
          className="flex h-8 w-11 items-center justify-center rounded-md text-[var(--qz-muted)] transition-colors hover:bg-[#e81123] hover:text-white"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </header>
  );
}
