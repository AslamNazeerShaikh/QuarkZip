# Window chrome: Linux + macOS in parallel

How QuarkZip renders one UI inside two different native windows, what
broke on macOS in `644f03b`, and the rules that keep both platforms
working when window chrome changes.

## Steady state (what each OS gets today)

`src-tauri/tauri.conf.json:13-30` holds ONE window entry for both
platforms (Tauri has no per-OS window entries), so per-OS differences
live in Rust `setup()` plus the `isMac` frontend branch:

| Setting | Linux (KDE) | macOS |
| --- | --- | --- |
| `decorations` | `false` (config) | `false` at creation → `true` via `set_decorations` in `src-tauri/src/lib.rs:124` |
| `transparent` | `true` (creation-only, never changes) | `true` (same; content covers it opaquely) |
| `titleBarStyle` | `Overlay` (irrelevant without decorations) | `Overlay`, re-applied deferred in `lib.rs:129` (see §3) |
| `hiddenTitle` | ignored (mac-only key) | `true` — native title hidden, custom strip owns the title |
| `trafficLightPosition` `{20, 24}` | ignored (needs Overlay + decorations) | lights float over content at creation inset |
| Frontend frame | floating card: `bg-transparent p-5` outer, `rounded-[20px]` bordered card (`src/App.tsx:213-224`) | flush opaque: `bg-[var(--qz-bg)]`, no padding, `rounded-none border-0 shadow-none` |
| Title strip | custom `TitleBar` with min/max/close (`src/TitleBar.tsx:78-141`) | slim drag strip, symmetric 76px inset (clears the lights left, keeps title truly centered), no buttons (`TitleBar.tsx:22-40`) |
| Drag | `invoke("drag_window")` on mousedown (borderless needs it) | same explicit `drag_window` mousedown (the attribute alone did not engage native drag on the Overlay setup) |

## What broke (2026-10-04, commit `644f03b`)

Before that commit macOS worked: the config had no
`decorations`/`transparent` keys (defaults: decorated, opaque),
`titleBarStyle: Overlay`, no Rust `setup()`, and a full-window opaque
frontend with a simple drag header.

`644f03b` introduced the Linux floating design globally
(`decorations:false, transparent:true`, floating rounded card, custom
window buttons) and tried to rescue macOS with
`set_decorations(true)` + `TitleBarStyle::Visible` in `setup()`.
That can never work: **`transparent` is creation-only** — no
`set_transparent` exists on `tauri::window::Window` /
`WebviewWindow` (verified against tauri 2.12.1 API) — so the native
bar lived outside the webview and stayed transparent, showing the
desktop behind the traffic lights and title.

## Why Overlay alone still failed (the async race)

Switching the override to `Overlay` did not fix it either; binary
timestamps proved the running app already contained the change.
Root cause, verified in dependency source:

- `set_decorations(true)` → tao `set_decorations` →
  `set_style_mask_async` → `DispatchQueue::main().exec_async`
  (runs **later**).
  (`tao-0.37.1/.../platform_impl/macos/util/async.rs:63`)
- `set_title_bar_style(Overlay)` →
  `setTitlebarAppearsTransparent` (**sync**, immediate) +
  `set_fullsize_content_view` → `set_style_mask_sync` (immediate).
  (`tao-0.37.1/.../platform_impl/macos/window.rs:1717-1730`)

The async mask rewrite (`Titled|Closable|Miniaturizable|Resizable`,
*without* `FullSizeContentView`) lands last and wipes the overlay
state — back to a `Visible` strip above the content.

Fix (`lib.rs:120-139`): apply `set_decorations(true)` immediately,
then defer `set_title_bar_style(Overlay)` + `show()` by 500ms on a
spawned thread. The window starts hidden (`visible: false`) and each
step logs a `[quarkzip]` line to the `tauri dev` terminal, so a
regression is diagnosable from stdout.

## Rules for parallel macOS/Linux development

1. **Creation-time vs runtime.** `transparent`, `decorations`
   (effectively), `hiddenTitle`, `trafficLightPosition` are fixed at
   window creation. Runtime setters exist for `decorations`,
   `titleBarStyle`, `shadow` — but never assume two of them compose
   when fired back-to-back; check tao/wry ordering first.
2. **One config, two chromes.** Any new window key in
   `tauri.conf.json` applies to both OSes. macOS exceptions go in
   the `#[cfg(target_os = "macos")]` block in `setup()`
   (`lib.rs:121-133`); Linux stays on the config defaults. Frontend
   differences go behind `isMac` (`App.tsx:65`), which defaults to
   the Linux look outside Tauri (tests, browser).
3. **macOS overlay checklist** for any titlebar-adjacent change:
   keep `decorations:true` + `Overlay` + `hiddenTitle:true`;
   keep the symmetric 76px inset in the Mac strip in sync with
   `trafficLightPosition` (left clears the lights, right mirrors it so
   the title stays truly centered); keep `data-tauri-drag-region` on the
   strip (Overlay windows need an explicit drag region and cannot
   drag while unfocused — upstream Tauri caveat).
4. **No doubled chrome.** The failure signature is always a doubled
   title or doubled controls (native + custom). macOS must never
   render window buttons (traffic lights own that); Linux must never
   lose its min/max/close (no native bar exists).
5. **Restart Rust, HMR is not enough.** Frontend changes hot-reload;
   Rust `setup()` changes need a full `tauri dev` restart. When a
   Mac fix "doesn't take", compare `src-tauri/target/debug/quarkzip`
   mtime against the edited source before any other theory.
6. **Test both branches.** `npm test` covers `App`/`TitleBar`
   (mac branch via mocked `platform()`); e2e `?platform=macos`
   (`e2e/specs/titlebar.spec.ts:55`) asserts no custom `header` on
   Mac. Any chrome PR must pass `npm test`, `cargo test --lib`,
   and a visual check on both OSes — there is no substitute for the
   macOS eyeball test (rounding, light inset, drag).
7. **Upstream gotchas on record.** `trafficLightPosition` needs
   `Overlay` + `decorations:true` (Tauri ≥ 2.4). Setting the window
   title can reset the light inset
   ([tauri#13044](https://github.com/tauri-apps/tauri/issues/13044));
   `setWindowTitle` (`App.tsx`) therefore stays best-effort.
