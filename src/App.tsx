import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { dirname } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { Download, ChevronDown, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import ArchiveTable from "./ArchiveTable";
import TitleBar from "./TitleBar";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";
import ExtractDialog from "./ExtractDialog";
import ExtractDoneDialog, { type ExtractResult } from "./ExtractDoneDialog";
import Pagination, { type PageSize } from "./Pagination";
import ThemeSwitch from "./ThemeSwitch";
import { Button } from "./components/ui/button";
import { useTheme } from "./useTheme";

export interface ArchiveEntry {
  path: string;
  size: number | null;
  modified: string | null;
  is_folder: boolean;
}

const ARCHIVE_FILTERS = [
  "7z",
  "zip",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "zst",
  "rar",
  "wim",
  "iso",
  "cab",
  "dmg",
  "lzma",
];

/// Window title follows the open archive; best-effort (mocked backends
/// reject, and the static `tauri.conf.json` title covers cold start).
async function setWindowTitle(archive: string | null): Promise<void> {
  try {
    await getCurrentWindow().setTitle(
      archive ? `QuarkZip | "Path: ${archive}"` : "QuarkZip",
    );
  } catch {
    /* non-Tauri runtimes (tests, browser): ignore */
  }
}

export default function App() {
  const { choice, setChoice } = useTheme();
  // macOS uses an overlay title bar (traffic lights float over the webview,
  // set in Rust), so TitleBar renders a slim drag strip there instead of the
  // Linux custom window controls.
  // The overlay frame also needs a flush opaque layout: the floating card
  // (transparent margin + rounded corners) only fits borderless windows.
  // With decorations on, that margin shows the desktop around the card —
  // traffic lights stranded above the UI.
  // Defaults to shown: non-Tauri runtimes (tests, browser) keep it.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    try {
      setIsMac(platform() === "macos");
    } catch {
      // Non-Tauri runtimes (tests, browser): keep the custom bar.
    }
  }, []);
  // Maximized windows go flush (no margin/radius — a transparent gap would
  // show the desktop around a fullscreen window); windowed mode floats the
  // card in a transparent margin so the window shadow can render.
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const win = getCurrentWindow();
        setMaximized(await win.isMaximized());
        unlisten = await win.onResized(async () => {
          try {
            setMaximized(await win.isMaximized());
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* non-Tauri runtime: stay windowed */
      }
    })();
    return () => unlisten?.();
  }, []);
  const [archive, setArchive] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [info, setInfo] = useState<ArchiveInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [dest, setDest] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(new Set());
  const [doneInfo, setDoneInfo] = useState<ExtractResult | null>(null);

  const pageCount =
    pageSize === "all" ? 1 : Math.ceil(entries.length / pageSize);

  // New archive, or a shrink that strands the page: go back into range.
  useEffect(() => {
    setPage(0);
  }, [archive]);
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  async function listPath(path: string) {
    setLoading(true);
    setError(null);
    setDoneInfo(null);
    try {
      const list = await invoke<ArchiveEntry[]>("list_archive", { path });
      setArchive(path);
      setEntries(list);
      void setWindowTitle(path);
      // Details are best-effort: the table must work even if the
      // summary parse fails (or the backend predates `info_archive`).
      try {
        const summary = await invoke<ArchiveInfo>("info_archive", { path });
        setInfo(summary);
      } catch {
        setInfo(null);
      }
      // Default extract destination: beside the archive.
      try {
        setDest(await dirname(path));
      } catch {
        setDest("");
      }
    } catch (e) {
      setError(typeof e === "string" ? e : String(e));
      setArchive(null);
      setEntries([]);
      setInfo(null);
      setDest("");
      void setWindowTitle(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over" || event.payload.type === "enter") {
          setDragging(true);
        } else if (event.payload.type === "leave") {
          setDragging(false);
        } else if (event.payload.type === "drop") {
          setDragging(false);
          const [first] = event.payload.paths;
          if (typeof first === "string") void listPath(first);
        }
      })
      .then((off) => {
        unlisten = off;
      });
    return () => unlisten?.();
  }, []);

  async function openArchive() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Archives", extensions: ARCHIVE_FILTERS }],
    });
    if (typeof selected !== "string") return;
    await listPath(selected);
  }

  async function chooseDest() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir !== "string") return;
    setDest(dir);
    setDoneInfo(null);
  }

  async function extract() {
    if (!archive || !dest || extracting) return;
    const files = [...selectedPaths];
    const count = files.length === 0 ? entries.length : files.length;
    setExtracting(true);
    try {
      await invoke("extract_archive", { path: archive, dest, files });
      setDoneInfo({ ok: true, fileCount: count, dest });
    } catch (e) {
      setDoneInfo({
        ok: false,
        message: typeof e === "string" ? e : String(e),
        dest,
      });
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div
      data-testid="app-root"
      className={`h-screen w-screen ${isMac ? "bg-[var(--qz-bg)]" : "bg-transparent"} ${maximized || isMac ? "" : "p-5"}`}
    >
      <div
        data-testid="app-frame"
        className={`flex h-full flex-col overflow-hidden bg-[var(--qz-bg)] text-[var(--qz-text)] ${
          maximized || isMac
            ? "rounded-none border-0 shadow-none"
            : "rounded-[20px] border border-[var(--qz-window-border)] shadow-[var(--qz-shadow-window)]"
        }`}
      >
      <TitleBar archive={archive} hidden={isMac} maximized={maximized} />
      {/* 28px rhythm on the content sides/bottom; no top pad. The drop
          frame is window-fixed (not main-absolute), so its top edge floats
          in the title strip instead of crossing the card. */}
      <main className="relative flex min-h-0 flex-1 flex-col px-7 pb-7">
        {dragging && (
          <div className="pointer-events-none fixed inset-3.5 z-10 flex items-center justify-center rounded-[20px] border-[1.5px] border-dotted border-[var(--qz-primary)] bg-[var(--qz-primary)]/10">
            <p className="font-medium text-[var(--qz-text)]">
              Drop to open archive
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="pb-2 text-[var(--qz-danger)]">
            {error}
          </p>
        )}
        {/* 50/50 vertical split: overview card above, table below. */}
        <div className="flex min-h-0 flex-1 flex-col gap-7">
          <ArchiveOverview
            archive={archive}
            info={info}
            loading={loading}
            onOpen={() => void openArchive()}
          />
          <div className="flex min-h-0 flex-[1_1_50%] flex-col">
            <ArchiveTable
              data={entries}
              page={page}
              pageSize={pageSize}
              onSelectionChange={setSelectedPaths}
            />
          </div>
        </div>
        {/* Action bar in normal flow — nothing overlaps. */}
        <footer className="flex shrink-0 items-center justify-between gap-4 pt-7">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {archive && (
              <>
                <Button
                  size="bar"
                  onClick={() => setConfirming(true)}
                  disabled={!dest || extracting || entries.length === 0}
                  className="shrink-0"
                >
                  <Download size={14} aria-hidden />
                  {extracting ? "Extracting…" : "Extract"}
                </Button>
                <Button
                  variant="secondary"
                  size="bar"
                  onClick={() => void openArchive()}
                  className="shrink-0"
                >
                  Open new…
                </Button>
                <Button
                  variant="secondary"
                  size="bar"
                  onClick={() => void chooseDest()}
                  title={dest || "Choose where to extract"}
                  aria-label="Choose where to extract"
                  className="min-w-0 flex-1"
                >
                  <span className="flex w-full min-w-0 items-center justify-center gap-2">
                    <FolderOpen size={14} aria-hidden className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-center">
                      {dest || "Choose folder…"}
                    </span>
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className="shrink-0 text-[var(--qz-faint)]"
                    />
                  </span>
                </Button>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {archive && (
              <Pagination
                page={page}
                pageCount={entries.length === 0 ? 0 : pageCount}
                pageSize={pageSize}
                total={entries.length}
                onPage={setPage}
                onPageSize={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
              />
            )}
            <ThemeSwitch choice={choice} onChange={setChoice} />
          </div>
        </footer>
      </main>
      <ExtractDialog
        open={confirming}
        selected={selectedPaths.size}
        total={entries.length}
        dest={dest}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void extract();
        }}
      />
      {doneInfo && (
        <ExtractDoneDialog
          open
          result={doneInfo}
          onOk={() => setDoneInfo(null)}
        />
      )}
      </div>
    </div>
  );
}
