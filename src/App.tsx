import { Channel, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { dirname } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import {
  Download,
  ChevronDown,
  FolderOpen,
  Info,
  ListChecks,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ArchiveTable, {
  type SortDir,
  type SortKey,
} from "./components/ArchiveTable";
import TitleBar from "./components/TitleBar";
import AboutDialog from "./components/AboutDialog";
import PasswordDialog from "./components/PasswordDialog";
import PermissionDialog from "./components/PermissionDialog";
import TestDialog from "./components/TestDialog";
import ChecksumDialog from "./components/ChecksumDialog";
import { loadAppInfo, type AppInfo } from "./lib/appInfo";
import ArchiveOverview, {
  type ArchiveInfo,
} from "./components/ArchiveOverview";
import ExtractDialog from "./components/ExtractDialog";
import LoadDialog, { type LoadStats } from "./components/LoadDialog";
import ExtractDoneDialog, {
  type ExtractResult,
} from "./components/ExtractDoneDialog";
import Pagination, {
  ALL_PAGE_CAP,
  type PageSize,
} from "./components/Pagination";
import ThemeSwitch from "./components/ThemeSwitch";
import LanguageSwitch from "./components/LanguageSwitch";
import { Button } from "./components/ui/button";
import { useTheme } from "./hooks/useTheme";
import { useLanguage } from "./i18n/LanguageContext";
import { isPasswordError } from "./lib/password";
import { PRIVACY_SETTINGS_URL, isPermissionError } from "./lib/permissions";

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
  const { t } = useLanguage();
  // While the theme segment is out, pagination shrinks to its icon so the
  // card row never overflows at 800px; minimizing restores full width.
  const [themeOpen, setThemeOpen] = useState(false);
  // Card collapsed state, persisted across restarts (`quarkzip.collapsed`,
  // same pattern as theme/language): collapsed, the card shrink-wraps the
  // action row and the card-row menus (page size, language) drop downward
  // over the table instead of floating up past the card.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("quarkzip.collapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("quarkzip.collapsed", collapsed ? "1" : "0");
    } catch {
      /* private-mode writes fail: stay expanded this session */
    }
  }, [collapsed]);
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
  // Cold start shows no selection ring: WebKit can land initial focus
  // on the first button (notably with Full Keyboard Access), so release
  // any pre-interaction focus — on mount and on window focus. Once the
  // user clicks or tabs, focus is theirs and never stolen.
  useEffect(() => {
    let interacted = false;
    const mark = () => {
      interacted = true;
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    const release = () => {
      if (!interacted) (document.activeElement as HTMLElement | null)?.blur?.();
    };
    release();
    window.addEventListener("focus", release);
    return () => window.removeEventListener("focus", release);
  }, []);
  const [archive, setArchive] = useState<string | null>(null);
  // P2: the renderer holds ONE page only. The full listing lives in the
  // backend (`ListingState`); pages arrive via `get_page`, sorted
  // server-side. A 10M listing no longer materializes here (~5GB death).
  const [rows, setRows] = useState<ArchiveEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // A page fetch in flight (page turns are ms; sorts of millions take
  // seconds). Stale responses lose to the latest request id.
  const [paging, setPaging] = useState(false);
  const pageReqRef = useRef(0);
  const [info, setInfo] = useState<ArchiveInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Opening progress popup state: live counters from the backend Channel,
  // current phase, and the archive being opened. Cancel keeps the previous
  // listing intact (tracked via ref so late invokes stay silent).
  const [loadStats, setLoadStats] = useState<LoadStats | null>(null);
  const [loadPhase, setLoadPhase] = useState<"listing" | "details">("listing");
  const [loadStart, setLoadStart] = useState(0);
  const [loadElapsed, setLoadElapsed] = useState(0);
  const [opening, setOpening] = useState<string | null>(null);
  const cancelLoadRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [dest, setDest] = useState("");
  const [extracting, setExtracting] = useState(false);
  // Extract confirm mode: `selected` (K of N), `all` (whole archive), or
  // `empty` (Selected pressed with nothing checked — offers Extract All).
  const [confirming, setConfirming] = useState<
    "selected" | "all" | "empty" | null
  >(null);
  // Remembers the dialog's resolved destination + mode across the password
  // gate, so the retry extracts exactly what was confirmed.
  const [pendingExtract, setPendingExtract] = useState<{
    mode: "selected" | "all" | "empty";
    finalDest: string;
  } | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [doneInfo, setDoneInfo] = useState<ExtractResult | null>(null);
  // Filesystem permission denial during extract/test: the dedicated
  // dialog (grant in Settings, or pick another folder) instead of the
  // generic result popup.
  const [permission, setPermission] = useState<{
    mode: "extract" | "test";
    path: string;
  } | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutInfo, setAboutInfo] = useState<AppInfo | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [checksumOpen, setChecksumOpen] = useState(false);
  // Password gate: path awaiting unlock (dialog open), what to do once
  // verified (open the listing vs. retry the originating operation), and
  // the verified password of the current archive (reused for Test/Extract
  // so encrypted content keeps working after unlocking).
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [passwordMode, setPasswordMode] = useState<"open" | "extract" | "test">(
    "open",
  );
  const [archivePassword, setArchivePassword] = useState<string | null>(null);

  function askPassword(path: string, mode: "open" | "extract" | "test") {
    setPendingPath(path);
    setPasswordMode(mode);
    setPasswordOpen(true);
  }

  function closePasswordGate() {
    setPasswordOpen(false);
    setPendingPath(null);
  }

  function openAbout() {
    setAboutOpen(true);
    // Best-effort: the dialog shows placeholders until this resolves.
    // Denied/unavailable backend stays silent (placeholders persist).
    void loadAppInfo()
      .then(setAboutInfo)
      .catch(() => {});
  }

  const pageCount = pageSize === "all" ? 1 : Math.ceil(totalEntries / pageSize);

  /// One page from the backend store. Late responses stay silent when a
  /// newer request (page turn, sort, or fresh open) has superseded them.
  async function fetchPage(
    path: string,
    page: number,
    size: number,
    key: SortKey | null,
    dir: SortDir,
  ) {
    const id = ++pageReqRef.current;
    setPaging(true);
    try {
      const res = await invoke<{ rows: ArchiveEntry[]; total: number }>(
        "get_page",
        { path, page, pageSize: size, sortKey: key, sortDir: key ? dir : null },
      );
      if (pageReqRef.current !== id) return;
      setRows(res.rows);
      setTotalEntries(res.total);
    } catch (e) {
      if (pageReqRef.current !== id) return;
      setError(typeof e === "string" ? e : String(e));
    } finally {
      if (pageReqRef.current === id) setPaging(false);
    }
  }

  /// Numeric page size: "all" spans the whole listing (the menu hides it
  /// past the spacer cap, so this never exceeds it).
  function resolvedSize(size: PageSize, total: number): number {
    return size === "all" ? Math.max(total, 1) : size;
  }

  // New archive, or a shrink that strands the page: go back into range.
  useEffect(() => {
    setPage(0);
  }, [archive]);
  // Elapsed-time ticker for the opening progress popup.
  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(
      () => setLoadElapsed(Date.now() - loadStart),
      250,
    );
    return () => window.clearInterval(id);
  }, [loading, loadStart]);
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  async function listPath(path: string, password: string | null = null) {
    setLoading(true);
    setLoadStats(null);
    setLoadPhase("listing");
    setLoadStart(Date.now());
    setLoadElapsed(0);
    setOpening(path);
    cancelLoadRef.current = false;
    setError(null);
    setDoneInfo(null);
    // Live counters from the backend (entries so far; bytes only on the
    // sidecar path — the in-process engine has no stdout to measure).
    // Ignored once a cancel lands so a late snapshot can't reopen popup.
    const channel = new Channel<LoadStats>((msg) => {
      if (!cancelLoadRef.current && msg && typeof msg === "object") {
        setLoadStats({ bytes: msg.bytes ?? null, entries: msg.entries });
      }
    });
    try {
      const opened = await invoke<{ total: number }>("list_archive", {
        path,
        password,
        onProgress: channel,
      });
      if (cancelLoadRef.current) return;
      pageReqRef.current += 1;
      setArchive(path);
      setTotalEntries(opened.total);
      setArchivePassword(password);
      void setWindowTitle(path);
      // A stale "all" from a smaller listing cannot span a huge one (the
      // menu hides it past the cap, but state can outlive it by a render).
      let size = resolvedSize(pageSize, opened.total);
      if (size > ALL_PAGE_CAP) {
        size = 10000;
        setPageSize(10000);
      }
      if (opened.total > 0) {
        await fetchPage(path, 0, size, null, "asc");
      } else {
        setRows([]);
      }
      if (cancelLoadRef.current) return;
      // Details are best-effort: the table must work even if the
      // summary parse fails (or the backend predates `info_archive`).
      try {
        setLoadPhase("details");
        // Details summarize the stored listing (no engine re-run, no
        // password/progress needed — the open listing owns both).
        const summary = await invoke<ArchiveInfo>("info_archive", { path });
        if (cancelLoadRef.current) return;
        setInfo(summary);
      } catch {
        if (!cancelLoadRef.current) setInfo(null);
      }
      // Default extract destination: beside the archive.
      try {
        setDest(await dirname(path));
      } catch {
        setDest("");
      }
    } catch (e) {
      // Cancelled opens keep the previous listing exactly as-is.
      if (cancelLoadRef.current) return;
      const message = typeof e === "string" ? e : String(e);
      if (isPasswordError(message)) {
        // Encrypted archive: keep the current listing exactly as-is and
        // ask for the password instead of showing an error.
        askPassword(path, "open");
      } else {
        setError(message);
        setArchive(null);
        setRows([]);
        setTotalEntries(0);
        setInfo(null);
        setArchivePassword(null);
        setDest("");
        void setWindowTitle(null);
      }
    } finally {
      setLoading(false);
      setOpening(null);
    }
  }

  /// Aborts an in-flight open: the backend aborts the in-process listing, the popup closes,
  /// and the previous listing stays untouched (late invokes stay silent).
  function cancelLoading() {
    cancelLoadRef.current = true;
    setLoading(false);
    setOpening(null);
    void invoke("cancel_list_archive").catch(() => {});
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

  /// Page turn / size / sort: rows always come from the backend store.
  /// Sort keeps the current page (like the old client sort); size resets
  /// to the first page. Stale responses lose via the fetch request id.
  function changePage(next: number) {
    if (!archive) return;
    setPage(next);
    void fetchPage(
      archive,
      next,
      resolvedSize(pageSize, totalEntries),
      sortKey,
      sortDir,
    );
  }

  function changePageSize(size: PageSize) {
    if (!archive) return;
    setPageSize(size);
    setPage(0);
    void fetchPage(
      archive,
      0,
      resolvedSize(size, totalEntries),
      sortKey,
      sortDir,
    );
  }

  function changeSort(key: SortKey) {
    if (!archive || paging) return;
    const dir: SortDir =
      sortKey !== key ? "asc" : sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(dir);
    void fetchPage(
      archive,
      page,
      resolvedSize(pageSize, totalEntries),
      key,
      dir,
    );
  }

  async function openArchive() {
    let selected: string | string[] | null;
    try {
      selected = await open({
        multiple: false,
        filters: [{ name: "Archives", extensions: ARCHIVE_FILTERS }],
      });
    } catch (e) {
      // Picker denied/unavailable: quiet danger text, like every backend
      // failure — never an unhandled rejection.
      setError(typeof e === "string" ? e : String(e));
      return;
    }
    if (typeof selected !== "string") return;
    await listPath(selected);
  }

  async function chooseDest() {
    let dir: string | string[] | null;
    try {
      dir = await open({ directory: true, multiple: false });
    } catch (e) {
      setError(typeof e === "string" ? e : String(e));
      return;
    }
    if (typeof dir !== "string") return;
    setDest(dir);
    setDoneInfo(null);
  }

  async function extract(
    mode: "selected" | "all" | "empty",
    finalDest: string,
    passwordOverride: string | null = null,
  ) {
    if (!archive || !finalDest || extracting) return;
    // O(1) full extraction: an empty file list extracts everything
    // server-side, so 10M paths never cross IPC. A page-by-page "select
    // everything" collapses to the same (identical result, no argv blowup).
    const selectAll =
      mode !== "selected" ||
      selectedPaths.size === 0 ||
      selectedPaths.size >= totalEntries;
    const files = selectAll ? [] : [...selectedPaths];
    const count = selectAll ? totalEntries : files.length;
    const password = passwordOverride ?? archivePassword;
    setExtracting(true);
    try {
      await invoke("extract_archive", {
        path: archive,
        dest: finalDest,
        files,
        password,
      });
      setDoneInfo({ ok: true, fileCount: count, dest: finalDest });
    } catch (e) {
      const message = typeof e === "string" ? e : String(e);
      if (isPasswordError(message) && passwordOverride === null) {
        // First failure and no fresh password: ask, then retry on verify
        // instead of dumping raw engine errors. Cancel keeps state.
        if (archive) askPassword(archive, "extract");
      } else if (isPermissionError(message)) {
        setPermission({ mode: "extract", path: finalDest });
      } else {
        setDoneInfo({ ok: false, message, dest: finalDest });
      }
    } finally {
      setExtracting(false);
    }
  }

  /// Opens the Privacy Settings grant (best-effort: Linux ignores the
  /// macOS-only URL, and a denial stays silent — the dialog stays open).
  async function openPrivacySettings() {
    try {
      await openUrl(PRIVACY_SETTINGS_URL);
    } catch {
      /* best-effort only */
    }
  }

  /// Runs after the gate verifies a password: remembers it and retries the
  /// originating operation (open → load listing, extract/test → rerun).
  function acceptPassword(path: string, password: string) {
    closePasswordGate();
    if (passwordMode === "extract") {
      setArchivePassword(password);
      const req = pendingExtract ?? { mode: "all" as const, finalDest: dest };
      void extract(req.mode, req.finalDest, password);
    } else if (passwordMode === "test") {
      setArchivePassword(password);
      setTestOpen(true);
    } else {
      void listPath(path, password);
    }
  }

  return (
    <div
      id="qz-app-root"
      data-testid="app-root"
      className={`h-screen w-screen bg-transparent ${maximized || isMac ? "" : "p-5"}`}
    >
      <div
        id="qz-app-frame"
        data-testid="app-frame"
        className={`flex h-full flex-col overflow-hidden ${isMac ? "bg-[var(--qz-frame-bg)]" : "bg-[var(--qz-bg)]"} text-[var(--qz-text)] ${
          maximized || isMac
            ? "rounded-none border-0 shadow-none"
            : "rounded-[20px] border border-[var(--qz-window-border)] shadow-[var(--qz-shadow-window)]"
        }`}
      >
        <TitleBar
          archive={archive}
          hidden={isMac}
          maximized={maximized}
          onOpen={() => void openArchive()}
          openDisabled={loading}
        />
        {/* 28px rhythm on the content sides/bottom; no top pad. The drop
          frame traces the window edge: the flush mac/maximized window
          (native ~12px corners) vs. the floating Linux card (20px card
          in a 20px margin) — one radius for both misreads a corner. */}
        <main
          id="qz-app-main"
          className="relative flex min-h-0 flex-1 flex-col px-7 pb-7"
        >
          {dragging && (
            <div
              id="qz-app-drop-frame"
              className={`pointer-events-none fixed z-10 flex items-center justify-center border-[1.5px] border-dotted border-[var(--qz-primary)] bg-[var(--qz-primary)]/10 ${
                maximized || isMac
                  ? "inset-3 rounded-[12px]"
                  : "inset-5 rounded-[20px]"
              }`}
            >
              <p className="font-medium text-[var(--qz-text)]">
                {t("app.dropHint")}
              </p>
            </div>
          )}
          {error && (
            <p
              id="qz-app-error"
              role="alert"
              className="pb-2 text-[var(--qz-danger)]"
            >
              {error}
            </p>
          )}
          {/* Overview card above (half the space expanded, action row
            only when collapsed), table below absorbs the rest. */}
          <div
            id="qz-app-content"
            className="flex min-h-0 flex-1 flex-col gap-7"
          >
            <ArchiveOverview
              archive={archive}
              info={info}
              loading={loading}
              onOpen={() => void openArchive()}
              onTest={() => setTestOpen(true)}
              onChecksum={() => setChecksumOpen(true)}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              middleControls={
                archive ? (
                  <Pagination
                    page={page}
                    pageCount={totalEntries === 0 ? 0 : pageCount}
                    pageSize={pageSize}
                    total={totalEntries}
                    onPage={changePage}
                    onPageSize={changePageSize}
                    compact={themeOpen}
                    onExpand={() => setThemeOpen(false)}
                    below={collapsed}
                  />
                ) : undefined
              }
              utilityControls={
                <>
                  <ThemeSwitch
                    choice={choice}
                    onChange={setChoice}
                    expanded={themeOpen}
                    onExpandedChange={setThemeOpen}
                  />
                  <LanguageSwitch below={collapsed} />
                  {/* Icon-only shell like ThemeSwitch: h-9, 10px radius, 1px
                    border, card shadow. Hover/tip names it (aria-label + title). */}
                  <div
                    id="qz-app-about-shell"
                    className="qz-material-bar flex h-9 shrink-0 items-center rounded-[10px] border border-[var(--qz-border)] p-1 shadow-[var(--qz-shadow-card)]"
                  >
                    <button
                      id="qz-app-about-btn"
                      type="button"
                      onClick={openAbout}
                      aria-label="About QuarkZip"
                      title="About QuarkZip"
                      className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qz-muted)] transition-colors outline-none hover:text-[var(--qz-text)] focus-visible:ring-2 focus-visible:ring-[var(--qz-primary)]/40"
                    >
                      <Info size={18} aria-hidden />
                    </button>
                  </div>
                </>
              }
            />
            <div
              id="qz-app-table-wrap"
              className="flex min-h-0 flex-1 flex-col"
            >
              <ArchiveTable
                data={rows}
                page={page}
                pageSize={pageSize}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortKey={changeSort}
                listingId={archive}
                busy={paging}
                onSelectionChange={setSelectedPaths}
              />
            </div>
          </div>
          {/* Extract action bar in normal flow — nothing overlaps. Full
            horizontal width: the destination chooser absorbs every spare
            pixel and truncates, resizing live with the window. */}
          <footer
            id="qz-app-footer"
            className="flex shrink-0 items-center gap-2 pt-7"
          >
            {archive && (
              <>
                <Button
                  id="qz-app-extract-selected"
                  size="bar"
                  onClick={() =>
                    setConfirming(
                      selectedPaths.size === 0 ? "empty" : "selected",
                    )
                  }
                  disabled={!dest || extracting || totalEntries === 0}
                  className="shrink-0"
                >
                  <ListChecks
                    size={14}
                    aria-hidden
                    className="text-[var(--qz-primary)]"
                  />
                  {extracting ? t("app.extracting") : t("app.extractSelected")}
                </Button>
                <Button
                  id="qz-app-extract-all"
                  variant="success"
                  size="bar"
                  onClick={() => setConfirming("all")}
                  disabled={!dest || extracting || totalEntries === 0}
                  className="shrink-0"
                >
                  <Download
                    size={14}
                    aria-hidden
                    className="text-[var(--qz-extract)]"
                  />
                  {t("app.extractAll")}
                </Button>
                <Button
                  id="qz-app-choose-dest"
                  variant="secondary"
                  size="bar"
                  onClick={() => void chooseDest()}
                  title={dest || t("app.chooseDest")}
                  aria-label={t("app.chooseDest")}
                  className="min-w-0 flex-1"
                >
                  <span className="flex w-full min-w-0 items-center justify-center gap-2">
                    <FolderOpen size={14} aria-hidden className="shrink-0" />
                    <span
                      id="qz-app-dest-label"
                      className="min-w-0 flex-1 truncate text-center"
                    >
                      {dest || t("app.chooseFolder")}
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
          </footer>
        </main>
        <LoadDialog
          open={loading}
          archive={opening ?? ""}
          phase={loadPhase}
          stats={loadStats}
          elapsedMs={loadElapsed}
          onCancel={cancelLoading}
        />
        <ExtractDialog
          open={confirming !== null}
          mode={confirming ?? "all"}
          selected={selectedPaths.size}
          total={totalEntries}
          dest={dest}
          archivePath={archive ?? ""}
          onCancel={() => setConfirming(null)}
          onConfirm={(finalDest) => {
            const mode = confirming ?? "all";
            setConfirming(null);
            setPendingExtract({ mode, finalDest });
            void extract(mode, finalDest);
          }}
        />
        {doneInfo && (
          <ExtractDoneDialog
            open
            result={doneInfo}
            onOk={() => setDoneInfo(null)}
          />
        )}
        <AboutDialog
          open={aboutOpen}
          info={aboutInfo}
          onOk={() => setAboutOpen(false)}
        />
        {archive && (
          <>
            <TestDialog
              open={testOpen}
              archive={archive}
              password={archivePassword}
              onOk={() => setTestOpen(false)}
              onPasswordError={() => {
                // Never unlocked for this operation: swap the raw engine
                // error for the password gate; verifying reopens the test.
                setTestOpen(false);
                askPassword(archive, "test");
              }}
              onPermissionError={() => {
                setTestOpen(false);
                setPermission({ mode: "test", path: archive });
              }}
            />
            <ChecksumDialog
              open={checksumOpen}
              archive={archive}
              onClose={() => setChecksumOpen(false)}
            />
          </>
        )}
        {passwordOpen && pendingPath && (
          <PasswordDialog
            open
            archive={pendingPath}
            acceptLabel={
              passwordMode === "extract"
                ? t("app.extract")
                : passwordMode === "test"
                  ? t("overview.test")
                  : t("password.open")
            }
            onAccept={acceptPassword}
            onCancel={closePasswordGate}
          />
        )}
        {permission && (
          <PermissionDialog
            open
            mode={permission.mode}
            path={permission.path}
            onOpenSettings={() => void openPrivacySettings()}
            onChooseFolder={
              permission.mode === "extract"
                ? () => {
                    setPermission(null);
                    void chooseDest();
                  }
                : undefined
            }
            onCancel={() => setPermission(null)}
          />
        )}
      </div>
    </div>
  );
}
