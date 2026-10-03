import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { dirname } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Download, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import ArchiveTable from "./ArchiveTable";
import ArchiveOverview, { type ArchiveInfo } from "./ArchiveOverview";
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
    setExtracting(true);
    setExtractStatus({ kind: "busy", text: `Extracting to ${dest}…` });
    try {
      await invoke("extract_archive", { path: archive, dest });
      setExtractStatus({
        kind: "ok",
        text: `Extracted ${entries.length.toLocaleString("en-US")} entries to ${dest}`,
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
        className="h-14 shrink-0 cursor-default select-none"
      />
      {/* All rhythm is 28px: horizontal margins, card gap, footer offset. */}
      <main className="relative flex min-h-0 flex-1 flex-col px-7">
        {dragging && (
          <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-[20px] border-[1.5px] border-dotted border-[var(--qz-primary)] bg-[var(--qz-primary)]/10">
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
            entryCount={entries.length}
            loading={loading}
            onOpen={() => void openArchive()}
          />
          <div className="flex min-h-0 flex-[1_1_50%] flex-col">
            <ArchiveTable data={entries} page={page} pageSize={pageSize} />
          </div>
        </div>
        {/* Action bar in normal flow — nothing overlaps. */}
        <footer className="flex shrink-0 items-center justify-between gap-4 py-7">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {archive && (
              <>
                <Button variant="secondary" size="sm" onClick={() => void openArchive()}>
                  Browse…
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void chooseDest()}
                  title={dest || "Choose where to extract"}
                  aria-label="Choose where to extract"
                >
                  <FolderOpen size={14} aria-hidden />
                  <span className="max-w-48 truncate">
                    {dest || "Choose folder…"}
                  </span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => void extract()}
                  disabled={!dest || extracting}
                >
                  <Download size={14} aria-hidden />
                  {extracting ? "Extracting…" : "Extract"}
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
    </div>
  );
}
