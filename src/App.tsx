import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";
import ArchiveTable from "./ArchiveTable";
import ThemeSwitch from "./ThemeSwitch";
import { useTheme } from "./useTheme";

export interface ArchiveEntry {
  path: string;
  size: number | null;
  modified: string | null;
}

export default function App() {
  const { choice, setChoice } = useTheme();
  const [archive, setArchive] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function listPath(path: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<ArchiveEntry[]>("list_archive", { path });
      setArchive(path);
      setEntries(list);
    } catch (e) {
      setError(typeof e === "string" ? e : String(e));
      setArchive(null);
      setEntries([]);
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
      filters: [{ name: "Archives", extensions: ["7z", "zip", "tar"] }],
    });
    if (typeof selected !== "string") return;
    await listPath(selected);
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
      <main className="relative flex min-h-0 flex-1 flex-col px-4 pb-4">
        {dragging && (
          <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-3xl border-[1.5px] border-dotted border-[var(--qz-primary)] bg-[var(--qz-primary)]/10">
            <p className="font-medium text-[var(--qz-text)]">
              Drop to open archive
            </p>
          </div>
        )}
        {!archive && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => void openArchive()}
              className="flex items-center gap-2 rounded-lg bg-[var(--qz-primary)] px-5 py-2 font-medium text-white dark:text-[var(--qz-bg)]"
            >
              <PackageOpen size={18} aria-hidden />
              {loading ? "Reading…" : "Open archive"}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--qz-primary)]">
            {error}
          </p>
        )}
        {archive && (
          <p className="w-full truncate text-xs text-[var(--qz-muted)]">
            File Path: {archive} — {entries.length.toLocaleString("en-US")}{" "}
            entries
          </p>
        )}
        <ArchiveTable data={entries} />
      </main>
      <ThemeSwitch choice={choice} onChange={setChoice} />
    </div>
  );
}
