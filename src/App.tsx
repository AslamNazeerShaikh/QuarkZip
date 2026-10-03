import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
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

  async function openArchive() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Archives", extensions: ["7z", "zip", "tar"] }],
    });
    if (typeof selected !== "string") return;
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<ArchiveEntry[]>("list_archive", {
        path: selected,
      });
      setArchive(selected);
      setEntries(list);
    } catch (e) {
      setError(typeof e === "string" ? e : String(e));
      setArchive(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--qz-bg)] text-[var(--qz-text)]">
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button === 0) void invoke("drag_window");
        }}
        className="h-14 shrink-0 cursor-default select-none"
      />
      <main className="flex flex-1 flex-col items-center gap-4 px-8 pb-8">
        <button
          type="button"
          onClick={() => void openArchive()}
          className="rounded-lg bg-[var(--qz-primary)] px-5 py-2 font-medium text-white dark:text-[var(--qz-bg)]"
        >
          {loading ? "Reading…" : "Open archive"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-[var(--qz-primary)]">
            {error}
          </p>
        )}
        {archive && (
          <p className="w-full max-w-2xl truncate text-xs text-[var(--qz-muted)]">
            {archive} — {entries.length} entries
          </p>
        )}
        <ul className="w-full max-w-2xl divide-y divide-[var(--qz-border)] rounded-lg border border-[var(--qz-border)] bg-[var(--qz-surface)]">
          {entries.map((entry) => (
            <li
              key={entry.path}
              className="flex items-baseline justify-between gap-4 px-4 py-1.5 text-sm"
            >
              <span className="truncate">{entry.path}</span>
              <span className="shrink-0 text-xs text-[var(--qz-muted)]">
                {entry.size === null ? "—" : `${entry.size} B`}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <ThemeSwitch choice={choice} onChange={setChoice} />
    </div>
  );
}
