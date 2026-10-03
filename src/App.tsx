import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { dirname } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Download, ChevronDown, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import ArchiveTable from "./ArchiveTable";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";
import ExtractDialog from "./ExtractDialog";
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

interface ExtractStatus {
  kind: "busy" | "ok" | "err";
  text: string;
}

const STATUS_STYLE: Record<ExtractStatus["kind"], string> = {
  busy: "text-[var(--qz-muted)]",
  ok: "text-[var(--qz-success)]",
  err: "text-[var(--qz-danger)]",
};

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
  const [extractStatus, setExtractStatus] = useState<ExtractStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(new Set());

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
    setExtractStatus(null);
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
    setExtractStatus(null);
  }

  async function extract() {
    if (!archive || !dest || extracting) return;
    const files = [...selectedPaths];
    const count = files.length === 0 ? entries.length : files.length;
    setExtracting(true);
    setExtractStatus({ kind: "busy", text: `Extracting ${count.toLocaleString("en-US")} files to ${dest}…` });
    try {
      await invoke("extract_archive", { path: archive, dest, files });
      setExtractStatus({
        kind: "ok",
        text: `Extracted ${count.toLocaleString("en-US")} files to ${dest}`,
      });
    } catch (e) {
      setExtractStatus({
        kind: "err",
        text: typeof e === "string" ? e : String(e),
      });
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--qz-bg)] text-[var(--qz-text)]">
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0) void invoke("drag_window");
        }}
        className="relative flex h-14 shrink-0 cursor-default items-center justify-center select-none"
      >
        {/* Centered window title: `QuarkZip | /full/path`, ellipsis on
            overflow — pure CSS, so resize reflows dynamically. */}
        <span className="max-w-[75%] truncate px-2 text-[13px]">
          <span className="font-semibold">QuarkZip</span>
          {archive && (
            <span className="text-[var(--qz-muted)]"> | &quot;Path: {archive}&quot;</span>
          )}
        </span>
      </header>
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
                {extractStatus && (
                  <span
                    role="status"
                    title={extractStatus.text}
                    className={`max-w-64 truncate text-xs ${STATUS_STYLE[extractStatus.kind]}`}
                  >
                    {extractStatus.text}
                  </span>
                )}
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
    </div>
  );
}
