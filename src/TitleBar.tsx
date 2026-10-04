import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import type { MouseEvent } from "react";

interface TitleBarProps {
  archive: string | null;
  /// macOS uses the native title bar — render nothing.
  hidden?: boolean;
  /// Owned by the parent (it also drives the flush maximized layout).
  maximized: boolean;
}

/// Custom client-side title bar for borderless windows (`decorations: false`).
/// Used on Linux (Fedora/KDE) where the native title bar is disabled, so the
/// window gets rounded corners + its own minimize / maximize / close buttons.
/// The bar itself is the drag region; the buttons opt out of dragging.
export default function TitleBar({ archive, hidden, maximized }: TitleBarProps) {

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

  if (hidden) return null;

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
      {/* Left: app mark keeps the centered title truly centered. */}
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--qz-primary)]" />
      </div>

      {/* Centered window title, ellipsis on overflow. */}
      <span className="max-w-[52vw] truncate px-2 text-center text-[13px]">
        <span className="font-semibold">QuarkZip</span>
        {archive && (
          <span className="text-[var(--qz-muted)]">
            {" "}
            | &quot;Path: {archive}&quot;
          </span>
        )}
      </span>

      {/* Right: custom window controls (KDE right-side convention). */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="Minimize"
          title="Minimize"
          onMouseDown={stopDrag}
          onClick={() => void minimize()}
          className={btn}
        >
          <Minus size={15} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
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
          aria-label="Close"
          title="Close"
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
