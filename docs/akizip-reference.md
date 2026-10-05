# AkiZip reference (upstream)

Upstream repo: **https://github.com/AkiZip/AkiZip** (`master`, app version `0.4.1`).

> Visual 7-Zip archive manager for Linux. GTK4 + libadwaita, GPL-3.0, Flatpak-only. Engine: bundled `7zz` (`/app/bin/7zz`).
> Source verified from upstream `README.md`, `src/window.ui`, `src/*.ui`, `src/AkizipApplication.py`, `src/main.py`, `src/job_queue.py`, `src/plugins/*`, `src/ui/*`, `data/*`, `top.akizip.akizip.json`, `meson.build` (Oct 2026).
> QuarkZip uses this as feature/architecture reference: format support, smart recommendations, in-archive management, background job queue with progress/ETA/cancel, logs panel.

## 0. File hierarchy (accurate, `master` root)

```
AkiZip/
├── README.md                    # EN overview + features + Flatpak install + layout
├── readmes/{es,it,ja,ko,zh-CN,zh-HK}.md
├── COPYING / LICENSE / SECURITY.md / CONTRIBUTING.md
├── meson.build                  # project('akizip', version 0.4.1, meson>=1.0.0) + subdir(data,src,po)
├── top.akizip.akizip.json       # Flatpak manifest (7zip + akizip modules)
├── update-po.sh / .github/ / .gitignore
├── data/
│   ├── meson.build
│   ├── top.akizip.akizip.desktop.in   # Exec=akizip %F, MimeType=7z/zip/rar/tar/gz/bz2/xz/cab/iso/dmg/wim/…
│   ├── top.akizip.akizip.gschema.xml  # GSettings keys (see §6)
│   ├── top.akizip.akizip.metainfo.xml.in
│   ├── top.akizip.akizip.service.in   # D-Bus activatable
│   └── icons/hicolor/scalable/apps/top.akizip.akizip.svg
├── docs/
│   └── shotcut.png              # only file; no design doc
├── po/
│   ├── LINGUAS / POTFILES.in / meson.build / akizip.pot / update via update-po.sh + Weblate
│   └── es.po fr.po id.po it.po pl.po pt_BR.po ru.po ta.po tr.po zh_CN.po zh_HK.po
├── scripts/
│   └── check-format.sh
└── src/
    ├── meson.build               # gresource compile + akizip.in→akizip + install_data(moduledir)
    ├── akizip.in                 # launcher: GSettings language→LANGUAGE/LANG, gettext bind, Gio.Resource.load(akizip.gresource), main.main(VERSION)
    ├── akizip.gresource.xml      # prefix /top/akizip/akizip: window.ui, shortcuts/compress/add/extract/preferences/move-folder-chooser.ui
    ├── main.py                   # main(version): App + JobQueue(default-timeout) + sysop() + register_plugins + run/stop
    ├── AkizipApplication.py      # Adw.Application (HANDLES_OPEN), actions quit/about/preferences/logs/language, do_open() from file manager
    ├── job_queue.py              # JobQueue + JobHandle (see §4)
    ├── window.py                 # 36-byte shim re-exporting ui/window.AkizipWindow
    ├── test.py
    ├── window.ui                 # main window (see §1)
    ├── compress-dialog.ui / add-dialog.ui / extract-dialog.ui
    ├── move-folder-chooser.ui / preferences.ui / shortcuts-dialog.ui
    ├── plugins/
    │   ├── __init__.py           # register_plugins(): sevenzip + system_job only
    │   ├── readme.md             # plugin contract (UI never blocks; group.action; timeout/cancel_event/task_status)
    │   ├── sevenzip.py           # archive.* commands → 7zz (see §7)
    │   ├── system_job.py         # system.move/scan/suggest_zip_paramiters (chunked copy, scan, recommender)
    │   ├── system.py             # sysop immediate state (selection/dest/format-category) — NOT queued
    │   ├── status.py             # status task state machine (see §4)
    │   ├── context_menu.py       # context_menu_state
    │   └── password.py           # is_password_error()
    └── ui/
        ├── __init__.py
        ├── window.py             # ~2278-line AkizipWindow (LogPanelMixin+InfoDialogMixin): all but*/_present_*/_run_command/_refresh/parse_archive_entries/_host_path
        ├── log_panel.py          # LogPanelMixin: Logs window + per-job rows + Cancel button
        ├── info_dialog.py        # InfoDialogMixin
        ├── add_dialog.py         # AddDialog
        └── move_folder_chooser.py# FolderChooserDialog
```

Install layout (`src/meson.build`): python sources → `$pkgdatadir/akizip/` (`__init__, job_queue, main, window, AkizipApplication` + `plugins/` + `ui/`), `akizip.gresource` → `$pkgdatadir`, executable → `$bindir/akizip`.

## 1. Main window (`src/window.ui`, `src/ui/window.py`)

Single `AdwApplicationWindow` (`AkizipWindow`, 800x600) → `AdwToastOverlay#toast_overlay` → `AdwToolbarView` → `AdwHeaderBar` (hamburger `GtkMenuButton#primary_menu` only) + vertical content box (margins 10, spacing 10):

### Toolbar buttons (icon 24px + label, `width-request 70`)

| ID | Label | Icon | Handler | Notes |
| --- | --- | --- | --- | --- |
| `choose_button` | Open | `document-open-symbolic` | `on_choose_file` | FileChooser portal |
| `add_button` | Compress | `list-add-symbolic` | `butadd` | `AdwSplitButton` + `add_menu` |
| `extract_split_button` | Extract All | `list-remove-symbolic` | `butextract` | `AdwSplitButton` + `extract_menu`; hidden sibling `extract_menu_button` (`extract_popup_menu`) shown in selection context |
| `test_button` | Test | `media-playback-start-symbolic` | `buttest` | Integrity test |
| `move_button` | Move | `edit-cut-symbolic` | `butmove` | In-archive move/rename |
| `delete_button` | Delete | `edit-delete-symbolic` | `butdelete` | In-archive delete |
| `info_button` | Info | `dialog-information-symbolic` | `butinfo` | `info_dialog.py`: file list + archive metadata |

### Address bar + file list

* `GtkEntry#address_entry` (`folder-symbolic`, placeholder `Path or archive`) → `on_address_activate`. Manual path entry + sync with selection; if text matches `archive/inner/` navigates inside archive instead of reopening.
* `GtkStack#file_list_stack` states:
  * `empty`: `AdwStatusPage(folder-symbolic, "Open an archive to view its contents")`
  * `not_archive`: `text-x-generic-symbolic, "The selected file is not an archive"`
  * `loading`: `GtkSpinner` 48px
  * `empty_archive`: `view-list-symbolic, "This archive is empty"`
  * `no_preview`: `"This format does not support preview"`
  * `list`: `GtkScrolledWindow#file_list_scroller` → `Gtk.ColumnView` (`Path/Size/Modified`, `Gtk.MultiSelection`, `..` up-row, right-click `context_menu`, double-click enters folders / temp-extracts nested archives).
* `Gtk.ColumnView` built in code (`_build_file_list`), not in `.ui`.

### Menus

* `primary_menu`: `Language[auto/en/zh_CN/zh_HK/fr/it/pl/pt_BR/es/ru/ta/id/tr]` (`app.language`), `Show Logs(app.logs)`, `Preferences(app.preferences)`, `About(app.about)`.
* `extract_menu`: `Extract Selected(win.extract-selected)`; `extract_popup_menu`: `Extract All(win.extract-all)` + `Extract Selected`.
* `context_menu` (right-click): `Extract / Move / Rename / Delete / Add File(win.add-file) / New Folder(win.new-folder)`.
* `add_menu`: `Add File / New Folder`.

UX: GNOME HIG, Flatpak portal choosers, toasts for transient results, window title tracks archive path, desktop `do_open()` opens archive from file manager.

## 2. Dialogs / pages (`src/*.ui`, `src/ui/*.py`)

| File | Purpose / key controls |
| --- | --- |
| `compress-dialog.ui` | `folder_entry + folder_browse`, `filename_entry + format_combo[.7z/.tar/.zip]`, hidden-dotfile warning (`output_hidden_warning`), `source_list(GtkListBox)` + `Add Files / Add Folders / Remove`, `level_combo[Store 0/Fastest 1/Fast 3/Normal 5/Maximum 7/Ultra 9]`, `method_combo[Default/LZMA2/LZMA/PPMd/BZip2/GNU/POSIX/Deflate/Deflate64]`, `dictionary_spin[0-1024 MB, 0=default]`, `threads_spin[0-64, 0=default]`, `password_entry(GtkPasswordEntry+peek)`, `encrypt_names_check(7z-only)`, `suggest_btn#Auto Recommend` |
| `add-dialog.ui` | Add existing file(s) into open archive at `dest_folder`; duplicate-name `name (2)` disambiguation |
| `extract-dialog.ui` (`content/entry/browse_button/password_entry`) | Dest folder + password; `entry.set_editable(not _IS_FLATPAK)` — inside Flatpak must use portal picker, manual edit disabled |
| `move-folder-chooser.ui` | Destination picker for in-archive move (`FolderChooserDialog`: `set_folders`, `set_source_path`, `set_current_path`) |
| `preferences.ui` (`AdwPreferencesPage#page`) | `General: timeout_spin[-1..3600, -1=no timeout]`; `Compression: depth_spin[0..10]` scan depth; `Default compression: format_combo[7z/tar/zip], level_combo, method_combo, dictionary_spin, threads_spin, encrypt_names_switch` |
| `shortcuts-dialog.ui` | Keyboard shortcuts |
| `ui/info_dialog.py` | Archive metadata + entry list dialog |
| `ui/log_panel.py` | Logs window: per-job command, state transitions, full `stdout+stderr`, diagnostics |
| `ui/add_dialog.py`, `ui/move_folder_chooser.py` | Input validation only, then `_run_command()` |
| `AkizipApplication.py: on_about_action` | `Adw.AboutDialog` v0.4.1, GPL-3.0, issue URL https://github.com/AkiZip/AkiZip/issues |

Smart recommendations (`system_job.py` + `suggest_btn`): `system.scan(path, depth)` builds `{total/files/folders/total_size/largest_file/extensions/categories[compressed/media/documents/code/other]/size_buckets[small<128K/medium<10M/large<100M/huge]/errors}`; `system.suggest_zip_paramiters(scan)` returns `{format/method/level/solid/dictionary/threads/sevenzip_args/reason}` by rules (empty→store; ≥90% packed + <50 files→tar store; ≥70% packed→zip store; ≥60% text→7z LZMA2 mx=9 solid; >5000 files→mx=7 solid; ≥2GiB→mx=3; else mx=5 balanced). Compress dialog applies suggestion to combos/spins and logs `sevenzip_args + reasons`.

## 3. Operations / commands (plugin architecture)

`src/plugins/readme.md` rule: UI never runs slow work; immediate state plugins called directly, long jobs via `JobQueue`. Command name `group.action`, signature `(…, timeout=-1, cancel_event=None, task_status=None)`, return short log string, raise `FileNotFoundError/TimeoutError/RuntimeError` on failure.

Registered in `src/plugins/__init__.py` (`sevenzip` + `system_job` only; `system/context_menu/password` are not queued):

`sevenzip.py` (`7zz` via `subprocess.Popen`, `start_new_session=True`, `DEVNULL stdin` — see §7):

| Command | 7zz argv |
| --- | --- |
| `archive.info` | `l -slt <archive> [-p<pw>]` |
| `archive.list` | `l -slt -ba <archive> [-p<pw>]` |
| `archive.compress_advance` | `a [sevenzip_args…] <out> <sources…>` (`-t/-m0/-mx/-md/-mmt/-mhe`, built by `_advanced_compress_args`) |
| `archive.extract` | `x <archive> -o<dir> -y [-p<pw>]` (whole archive, dest `<chosen>/<archive-stem>`) |
| `archive.extract_file` | `x <archive> -o<dir> -y -spd [-p<pw>] -- <names…>` (selected only) |
| `archive.delete` | `d <archive> -spd [-p<pw>] -- <names…>` |
| `archive.add` | `a <archive> -spd [-p<pw>] -- <staged…>` (cwd=temp staging dir) |
| `archive.test` | `t <archive> [-p<pw>]`, must contain `Everything is Ok` |
| `archive.move` | `rn <archive> -spd [-p<pw>] -- <src dst>…` (multi-pair, one rewrite) |
| `archive.rename` | `rn … -- <src> <parent/new>` (rejects `/`, `.`, `..`, empty) |
| `archive.mkdir` | `a <archive> -spd … -- <folder/>` (cwd=temp dir with staged empty folder) |

`system_job.py`: `system.move` (rename-or-chunked-copy, see §5), `system.scan`, `system.suggest_zip_paramiters` — cancel/timeout checked inside loop.
`system.py`: immediate state only (`sysop`: selected/destination/file info, `format_category`, `can_modify/can_compress/can_extract`).
`password.py`: `is_password_error()`; `context_menu.py`: `context_menu_state`.

`window.py: _command_summary()/_command_preview()`: short log titles e.g. `Compress test.zip`, `Extract test.zip`, `Move file.txt`.

## 4. Background jobs: progress / ETA / cancel / timeout

`src/job_queue.py: JobQueue` — single worker thread + `queue.Queue`, serial execution:

* `submit(fn, args, on_success, on_error, task_status, timeout, task_id, msg, on_status) → JobHandle(cancel_event)`. `timeout` overrides `default_timeout` (GSettings `default-timeout`). `_call_function` injects `timeout/cancel_event/task_status` only if the function signature accepts them (or `**kwargs`).
* Lifecycle in `_run()`: `pending → working(start(msg)) → finished(msg) / failed(msg) / timed_out(msg) / cancelled(msg)`; pre-start cancel short-circuits to `cancelled`. Post-return elapsed≥timeout also forces `timed_out`. Callbacks (`on_success/on_error/on_status`) marshalled via `GLib.idle_add` (or injected scheduler in tests).
* `src/plugins/status.py: status`: `task_id/msg/timeout`, `started_at/finished_at`, `progress:int|None`, `eta:float|None`, `set_progress(%)` computes `eta = elapsed*(100/%−1)`, `set_on_progress()`, `is_timeout()/check_timeout()/is_done()/to_dict()/__str__`. Enum `_status: pending/working/finished/warning/timeout/error/cancelled`.
* Progress source: `sevenzip._run_7zip(..., -bsp2)` parses `(\d+)%` from `stderr` (`\x08`-aware reader threads for stdout/stderr) → `task_status.set_progress()` → `on_status` repaints logs/tasks UI.
* Cancel: `JobHandle.cancel()` sets `cancel_event`; `_run_7zip` polls every `0.1s`, `_kill_process(os.killpg(SIGKILL))` + `join(1.0)` + `raise RuntimeError('Cancelled')`; filesystem jobs check `cancel_event.is_set()` per chunk (`_check_stop`). Logs row Cancel button (`process-stop-symbolic`) → `handle.cancel()` → label `Cancelling...`, button desensitised.
* Timeout: elapsed vs `timeout` polled in same loop → kill + `raise TimeoutError(f'7zz timed out after {s}s')`; `JobQueue` also post-checks elapsed after return.
* UI contract (`readme.md §5`): button handler only validates paths → `_run_command("group.feature", *args, on_success_extra, on_error_extra)` → `_append_log(summary, content, state, handle)` row in Logs window + `on_status` header recolour; results/toasts on `on_success/on_error`. UI holds no compress/extract/move logic and never blocks main thread.

## 5. File handling, safety, i18n

* Flatpak-scoped: only user-picked paths via portal (`Gtk.FileChooserNative`); `ui/window.py: _host_path()` maps sandbox → host display path via `user.document-portal.host-path` xattr (file, else walk parents), fallback raw path; `_IS_FLATPAK = exists(/.flatpak-info)` gates manual entry editing.
* `sysop` format gating (`system.py`): `FULL_FEATURE_MODIFY {.7z,.zip,.tar}`, `READ_ONLY {.rar,.gz,.tar.gz,.tar.bz2,.tar.xz,.iso}`, `NO_PREVIEW {.bz2,.xz}`, `ARCHIVE_SUFFIXES` (also cab/iso/dmg/wim/swm/esd/arj/z/taz/lzh/lha, multi-suffix aware). `can_modify = archive and not nested and suffix in FULL`; every mutating button checks `can_extract` then `can_modify` before submitting.
* Untrusted entry names: all switches (incl. `-p`) before `--`, plus `-spd` (disable wildcard) so `-p…` / `*` names stay operands (`extract_file/delete/move/rename/add/mkdir`).
* `archive.add`: validates sources exist, `dest_folder` stripped of `/`, rejects absolute / `..`; stages each source as symlink under `tempfile.mkdtemp(akizip-add-*)` with exact `dest/name` layout + `(2)` dedup, `7z` dereferences links, `shutil.rmtree` cleanup. `archive.mkdir` same pattern (`akizip-mkdir-*`).
* `system.move_path`: rejects missing source, non-dir dest, existing target, move-into-itself; fast `Path.replace`, on `EXDEV` falls back to `_copy_path` (1 MiB chunks, `copystat`, symlink-preserving) + `_remove_source`; `_remove_partial` on failure.
* Passwords: optional `-p…`, 7z filename encryption toggle (`-mhe=on`, 7z-only, enforced in UI sensitivity + backend); `Test/Extract/Move/Delete/Rename/Add` wrap `on_error` with `is_password_error → _present_password_dialog(retry)` loop.
* Nested archives: temp-extract + `select_nested(path, temp_dir)` (tracked in `_temp_dirs`, cleaned on `clear_selected`); `no_preview` for non-listable formats.
* Formats: create `.7z/.zip/.tar`; extract `.rar/.gz/.bz2/.xz/.tar.gz/.tar.bz2/.tar.xz/.iso` + others 7zz supports; browse most supported formats.
* Integrity: `Test` before extract recommended; `t` failure raises with full output.
* Settings persist via GSettings (`top.akizip.akizip`, `data/….gschema.xml`): `language[auto]`, `default-compress-{format[7z]/level[5]/method[default]/dictionary-size[0]/threads[0]/encrypt-names[false]}`, `compress-scan-depth[3, 0..10]`, `default-timeout[-1, -1..3600]`. All reads wrapped in `try/except → fallback`.
* i18n: `gettext`, `po/*.po` + `update-po.sh`, Weblate, 10+ locales, `translator-credits` in About; `akizip.in` promotes `LANG→LANGUAGE` in Flatpak so system locale wins, applies `GSettings:language` before builder loads.

## 6. Versions / libraries / runtime

| Layer | Pinned value (master) | Where |
| --- | --- | --- |
| App | `0.4.1` | `meson.build`, `AkizipApplication:AboutDialog`, `akizip.in:VERSION` |
| 7-Zip | `26.03`, `7z2603-linux-x64.tar.xz`, `sha256 dc99eff5…3c695`, `https://github.com/ip7z/7zip/releases/download/26.03/…` | `top.akizip.akizip.json: modules[7zip]` |
| Flatpak runtime | `org.gnome.Platform` + `Sdk` version `50` | `top.akizip.akizip.json` |
| Build | `meson >= 1.0.0`, `simple` buildsystem for 7zip module | `meson.build`, `top.akizip.akizip.json` |
| Language | `python3` (`python.find_installation`), no vendored wheels | `src/meson.build` |
| GUI | `GTK 4.0` (`gi.require_version('Gtk','4.0')`), `libadwaita 1` (`Adw`), `PyGObject` (`gi.repository: Gtk/Gio/Adw/GLib/Gdk/Pango/GObject`), `GResource` bundle | `*.ui (requires)`, `main.py`, `akizip.in` |
| OS integration | `GSettings(top.akizip.akizip)`, `Gio.Application(HANDLES_OPEN)` + `DBusActivatable=true`, `MimeType` list in `.desktop.in` (7z/zip/rar/tar/gzip/bzip2/xz/cab/iso/dmg/wim/arj/…) | `data/*` |
| i18n | `gettext`, `po/LINGUAS` = 11 catalogues | `po/`, `akizip.in` |
| Dev | `scripts/check-format.sh` | `scripts/` |

7-Zip trademark: Igor Pavlov; AkiZip notes no affiliation/endorsement. Licence: app `GPL-3.0-or-later` (`COPYING`), 7-Zip mostly LGPL + unRAR restriction — ship required notices.

## 7. How 7z is called and distributed

Distribution (`top.akizip.akizip.json`, module `7zip`):

```json
{"build-commands": ["tar -xf 7z2603-linux-x64.tar.xz", "install -Dm755 7zz /app/bin/7zz", "install -Dm755 7zzs /app/bin/7zzs"]}
```

Flatpak build downloads the upstream tarball (URL+sha256 above) and installs **both** `7zz` and `7zzs` to `/app/bin/`. The app itself only invokes `SEVENZIP_PATH = '/app/bin/7zz'`. No system 7z, no PATH lookup, no bundled `.so`.

Invocation (`src/plugins/sevenzip.py: _run_7zip(args, timeout, cancel_event, on_progress, cwd)`):

* argv list only — never shell string: `subprocess.Popen(['/app/bin/7zz', *args], stdout=PIPE, stderr=PIPE, stdin=DEVNULL, text=True, start_new_session=True, cwd=cwd)`. `start_new_session` puts 7zz in its own process group so `_kill_process(os.killpg(pid, SIGKILL))` kills children too.
* `-bsp2` appended (before `--` when present) only when a progress callback exists; `_parse_progress(r'(\d+)%')` on the backspace-rewritten stderr stream.
* Two modes: without `on_progress` → `communicate(timeout=0.1)` poll loop; with `on_progress` → dedicated stdout/stderr reader threads + `poll()` + `sleep(0.1)` loop. Both loops check `cancel_event` and monotonic `timeout` each iteration.
* `archive_add/archive_mkdir` pass `cwd=temp staging dir`; all mutating calls keep switches before `--` and use `-spd`.
* Compared to QuarkZip: same no-shell-list-argv rule, but QuarkZip spawns the Tauri sidecar `binaries/7zz` via `tauri-plugin-shell` (`Command::sidecar`) with `LIST_TIMEOUT_SECS=60` / `EXTRACT_TIMEOUT_SECS=600` and Gatekeeper-hint error, while AkiZip uses direct `Popen` + per-job `default-timeout` (default `-1` = none).

## 8. Error handling (by layer)

1. **Immediate validation (`sysop._failed` / button guards, no exception):** empty path, `Path not found`, `Not a file or folder`, `No destination selected`, `Destination is not a folder` → `success=False, msg, updated_at`; buttons add `can_extract/can_modify` gates → `_append_log('… failed', reason, ERROR)` and/or toast (`No file selected`, `Select exactly one item to rename`, `Invalid name/folder name`, `Source and destination are the same`, `Cannot move a folder into itself`, `Manual destination paths cannot contain '..'`, `This archive format does not support modification`, `Selected path is not an archive`).
2. **Plugin raises (caught by `JobQueue._run`):** `FileNotFoundError/NotADirectoryError/FileExistsError/ValueError` (move_path, add/mkdir validation), `OSError` passthrough (non-`EXDEV`), `RuntimeError(output or '7zz exited with N' / 'Cancelled' / test-without-`Everything is Ok`)`, `TimeoutError('7zz timed out after Ns' / 'Move timed out')`. Scan never raises for bad children — appends to `errors[]` and returns partial result.
3. **Queue mapping:** `cancel_event.is_set()` at dequeue or after exception → `cancelled()`; `isinstance TimeoutError` → `timed_out()`; else → `failed(msg)`. Post-success elapsed≥timeout → `timed_out` + `on_error`. `on_success(result)` only on `finished`; `on_status(task_status)` on every transition (logs UI recolours header: Running blue / Done green / Warning amber / Timeout orange / Error red / Cancelled+Pending grey).
4. **7z output as error:** non-zero exit → combined `stdout+stderr` becomes the exception message and the expandable log body (`Gtk.TextView`, monospace, `WORD_CHAR` wrap); empty output falls back to `7zz exited with N`.
5. **Password recovery:** `is_password_error(error)` in `buttest/butextract/butmove/butdelete/butrename/butadd_file/butnew_folder` → `_present_password_dialog(retry with new password)` instead of failing; user Cancel ends the chain silently.
6. **Destructive confirmations:** Delete → `Adw.AlertDialog(DESTRUCTIVE)` single/multi message; compress-to-existing-path → `Replace existing file? (DESTRUCTIVE)` + `unlink` failure logged separately; move/rename same-name → toast, no job submitted.
7. **Partial-write safety:** `_copy_path` failure → `_remove_partial(target)`; `archive_add/mkdir` temp dirs always `rmtree(ignore_errors=True)`; nested temp dirs tracked and cleaned on selection clear.
8. **Settings robustness:** every `settings.get_*/set_*` wrapped in `try/except → fallback/pass`, so missing schema keys degrade to defaults instead of crashing; `compress-scan-depth` cast guarded with `max(0,int(n))` fallback `3`.

## 9. Background / shell commands (complete)

* **Only background child process is 7zz.** No `sh -c`, no `shell=True`, no `glib.spawn`, no `xdg-open`, no other CLI tools. Everything else is in-process Python: `pathlib/shutil/os/tempfile` filesystem work, `os.getxattr` portal mapping, `Gio/GLib` main-loop marshalling.
* Queue: one `threading.Thread(AkizipJobQueue)` runs all jobs serially; 7zz I/O uses two daemon reader threads per job + main poll loop. UI thread never waits — results return via `GLib.idle_add(on_success/on_error/on_status)`.
* QuarkZip parallel: Tauri `shell.sidecar("binaries/7zz").args(explicit Vec<String>).spawn()` + async stdout/stderr line collection + `tokio::time::timeout` kill — same shape (explicit argv, stream progress, kill on cancel/timeout), different runtime.

## 10. What QuarkZip borrows

Format matrix, compress-dialog fields + Auto Recommend, in-archive add/move/rename/delete/mkdir semantics, `JobQueue + status(progress/ETA) + cancel/timeout + logs` pattern, `--`/`-spd` hardening, temp-staging for adds. QuarkZip diverges: Tauri 2 + React + Rust sidecar (`src-tauri/binaries/7zz-*`) instead of GTK/Flatpak, single-window 50/50 overview/table layout (`docs/ui-guidelines.md`).
