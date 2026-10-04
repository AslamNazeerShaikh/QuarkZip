/// In-memory fake Tauri backend for Playwright runs (Vite `e2e` mode).
/// The mock IPC modules route here; specs drive scenarios through
/// `window.__e2e` (state, reset, drop simulation).

export interface FakeEntry {
  path: string;
  size: number | null;
  modified: string | null;
  is_folder: boolean;
}

export interface FakeInfo {
  container_format: string | null;
  physical_size: number | null;
  headers_size: number | null;
  method: string | null;
  solid: string | null;
  blocks: string | null;
  file_count: number;
  folder_count: number;
  total_unpacked: number;
  total_packed: number;
  compression_ratio: number;
  max_depth: number;
  methods: string[];
  encrypted_files: number;
  encryption_scheme: string;
  host_os: string[];
  container_size: number | null;
  container_modified: number | null;
  extra: Record<string, string>;
}

export interface FakeArchive {
  entries: FakeEntry[];
  /** Null info exercises the "Details unavailable" fallback. */
  info: FakeInfo | null;
  /** Throw paths to simulate backend failures. */
  listError?: string;
  infoError?: string;
}

export interface E2EState {
  archives: Record<string, FakeArchive>;
  /** File-picker result (`undefined` = not stubbed, `null` = user cancelled). */
  openFileResult: string | null | undefined;
  openDirResult: string | null | undefined;
  /** Non-null makes the next extract_archive reject with this message. */
  extractError: string | null;
  maximized: boolean;
  osPlatform: string;
  calls: {
    setTitle: string[];
    minimize: number;
    toggleMaximize: number;
    close: number;
    dragWindow: number;
    extracts: Array<{ path: string; dest: string; files: string[] }>;
  };
  dropHandlers: Array<(e: DropEvent) => void>;
}

export type DropEvent =
  | { payload: { type: "over" | "enter"; paths: string[] } }
  | { payload: { type: "leave" } }
  | { payload: { type: "drop"; paths: string[] } };

function freshState(): E2EState {
  return {
    archives: {},
    openFileResult: undefined,
    openDirResult: undefined,
    extractError: null,
    maximized: false,
    osPlatform: "linux",
    calls: {
      setTitle: [],
      minimize: 0,
      toggleMaximize: 0,
      close: 0,
      dragWindow: 0,
      extracts: [],
    },
    dropHandlers: [],
  };
}

export const state: E2EState = freshState();

export function resetState(): void {
  const keepPlatform = state.osPlatform;
  const keepHandlers = state.dropHandlers;
  const next = freshState();
  // Keep the same object identity so imported mocks see the reset.
  Object.assign(state, next);
  // The platform comes from the URL (`?platform=macos` exercises the macOS
  // native-titlebar path) and survives resets, as do the webview drop
  // subscriptions: the app registers once on mount (before specs reset),
  // and reset never remounts it, so clearing would orphan the live handler.
  state.osPlatform = keepPlatform;
  state.dropHandlers = keepHandlers;
}

function defaultInfo(entryCount: number): FakeInfo {
  return {
    container_format: "zip",
    physical_size: 1024,
    headers_size: 128,
    method: "Deflate",
    solid: "—",
    blocks: "1",
    file_count: entryCount,
    folder_count: 0,
    total_unpacked: 2048,
    total_packed: 1024,
    compression_ratio: 0.5,
    max_depth: 1,
    methods: ["Deflate"],
    encrypted_files: 0,
    encryption_scheme: "—",
    host_os: ["Unix"],
    container_size: 1024,
    container_modified: 1_759_623_585,
    extra: {},
  };
}

/** Registers a canned archive; entries default to `count` text files. */
export function addArchive(
  path: string,
  opts: {
    entries?: FakeEntry[];
    count?: number;
    info?: FakeInfo | null;
    listError?: string;
    infoError?: string;
  } = {},
): void {
  const count = opts.count ?? 3;
  const entries =
    opts.entries ??
    Array.from({ length: count }, (_, i) => ({
      path: `file-${i + 1}.txt`,
      size: 100 * (i + 1),
      modified: null,
      is_folder: false,
    }));
  state.archives[path] = {
    entries,
    info:
      opts.info === undefined ? defaultInfo(entries.length) : opts.info,
    listError: opts.listError,
    infoError: opts.infoError,
  };
}

function lookup(path: string): FakeArchive {
  const archive = state.archives[path];
  if (!archive) throw `Cannot open "${path}": no such archive (e2e stub)`;
  return archive;
}

export async function handleInvoke(cmd: string, args: unknown): Promise<unknown> {
  const a = args as Record<string, unknown>;
  switch (cmd) {
    case "drag_window":
      state.calls.dragWindow += 1;
      return null;
    case "list_archive": {
      const archive = lookup(a.path as string);
      if (archive.listError) throw archive.listError;
      return archive.entries;
    }
    case "info_archive": {
      const archive = lookup(a.path as string);
      if (archive.infoError) throw archive.infoError;
      if (!archive.info) throw "No summary reported";
      return archive.info;
    }
    case "extract_archive": {
      state.calls.extracts.push({
        path: a.path as string,
        dest: a.dest as string,
        files: (a.files as string[]) ?? [],
      });
      if (state.extractError) throw state.extractError;
      return "Everything is Ok";
    }
    default:
      throw `unexpected command ${cmd}`;
  }
}

declare global {
  interface Window {
    __e2e: {
      state: E2EState;
      reset: () => void;
      addArchive: typeof addArchive;
      dragOver: (paths?: string[]) => void;
      dragLeave: () => void;
      drop: (paths: string[]) => void;
    };
  }
}

if (typeof window !== "undefined") {
  state.osPlatform =
    new URLSearchParams(window.location.search).get("platform") ?? "linux";
  window.__e2e = {
    state,
    reset: resetState,
    addArchive,
    dragOver: (paths = []) => {
      for (const h of state.dropHandlers) h({ payload: { type: "over", paths } });
    },
    dragLeave: () => {
      for (const h of state.dropHandlers) h({ payload: { type: "leave" } });
    },
    drop: (paths) => {
      for (const h of state.dropHandlers) h({ payload: { type: "drop", paths } });
    },
  };
}
