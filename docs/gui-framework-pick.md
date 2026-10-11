# GUI framework pick: egui vs iced for QuarkZip

Date: 2026-10-11. Status: **decided — egui (via eframe)**.
Trigger: the Tauri webview tree cannot carry 10M-entry archives (DOM +
IPC cost); the Rust core (7-Zip FFI bridge, facts/sort/children logic,
extract/test/checksum) stays untouched. Only the frontend moves.

Constraints that decided it (in order):

1. 10M entries, 10k+ per folder, least RAM/CPU — needs row virtualization.
2. Best-in-class macOS feel first (Tahoe-era), native Linux feel later.
   Windows out of scope.
3. Rapid development, terse code, easy theming, rich components.
4. Pure Rust, no web stack.

Versions researched: **egui 0.36.2 / eframe** and **iced 0.14.0**
(both Sep 2026).

## TL;DR

| Axis                   | egui                                                                                                                                                          | iced                                                               | Winner                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| 10M-row virtualization | Built-in (`ScrollArea::show_rows`, virtual `TableBuilder`; 2M-row issue on file)                                                                              | None — `scrollable` lays out all children (100k-row lag reports)   | **egui, decisive**                |
| macOS window chrome    | First-class (`fullsize_content_view`, `titlebar_shown`, `titlebar_buttons_shown`, `title_shown`, `movable_by_window_background`, `has_shadow`, `transparent`) | Generic (`decorations`, `transparent`, `blur`) only                | **egui**                          |
| Theming DX             | One mutable struct (`Visuals`: 36 fields, `dark()`/`light()`, per-`Ui` override, serde)                                                                       | 23 built-in themes + per-widget `Catalog` closures per state       | **egui** (terse) / iced (breadth) |
| Component count        | Core set + `egui_extras` (tables, dates, images, syntax)                                                                                                      | ~40 built-ins (table, markdown, qr, canvas, tooltip, text_editor…) | **iced**                          |
| Code verbosity         | Counter in ~10 lines, no enums/boilerplate                                                                                                                    | Counter needs `Message` enum + `update` + `view`                   | **egui, decisive**                |
| Compile times          | Fast with `glow` backend; `wgpu` roughly doubles it                                                                                                           | Heavy baseline (`wgpu` + `cosmic-text` always)                     | **egui**                          |
| Binary/RAM             | ~2–5MB binaries typical; static UI idles at ~0 CPU (repaint on demand)                                                                                        | Larger baseline; retained, also idles cleanly                      | **egui**                          |
| Accessibility          | Ships AccessKit (VoiceOver works)                                                                                                                             | Open issues (#552, #282), no explicit support                      | **egui**                          |
| CJK text               | Default fonts lack CJK — must bundle Noto (~+10MB)                                                                                                            | `cosmic-text` uses system fonts — CJK free                         | **iced**                          |
| Proven showcases       | ArtCraft suite (photocraft 45k★, 7 pro creative apps), Rerun                                                                                                  | COSMIC DE, Halloy, Kraken, liana                                   | Tie (both proven)                 |
| Tree widget            | `CollapsingHeader` + indent vlines; virtual tree hand-rolled on `show_rows`                                                                                   | Nothing tree-shaped; hand-rolled + manual viewport math            | **egui**                          |
| Test story             | `egui_kittest` (headless UI tests); Playwright dies with the DOM                                                                                              | Same situation (`iced_tester` exists)                              | Tie                               |

Neither renders real AppKit controls, so Tahoe Liquid Glass
(`NSGlassEffectView`) is unreachable in both — "native feel" means
pixel-close theming + correct chrome + behavior. Budget theme work
either way; egui's default look is gamy until themed, iced's defaults
look more native out of the box.

## 1. The decisive axis: 10M rows

- egui: `ScrollArea::show_rows` exists precisely for "inner area very
  long" (docs' own words); `TableBuilder` renders a virtual table
  (`TableBody::rows` docs describe virtual-table math); a filed issue
  discusses 2M rows. Our tree maps 1:1 — fixed 36px rows, render the
  visible window, backend chunks behind "pages". This is a solved
  problem in egui-land (`egui_virtual_list` adds extras).
- iced: `scrollable` has no windowing; every child lays out every frame.
  The r/rust "100k rows laggy on a gaming PC" thread is iced-shaped, and
  nothing in `iced_widget` (checked 0.14.2: no tree, no virtual list,
  no `show_rows` equivalent; closest is visibility `sensor`) fixes it.
  A 10M tree in iced means hand-rolled viewport culling against a
  retained layout engine — swimming upstream.

Verdict on axis 1 alone ends the contest for our workload.

## 2. Native macOS feel (the actual ask)

egui's `ViewportBuilder` (verified 0.36.2) exposes macOS-only knobs that
read like our `window-chrome.md` requirements list:

- `with_fullsize_content_view(true)` — content behind the titlebar
- `with_titlebar_shown(false)` + `with_title_shown(false)` — transparent
  titlebar for our overlay strip
- `with_titlebar_buttons_shown(bool)` — keep traffic lights, drop the rest
- `with_movable_by_window_background(true)` — drag strip for free
- `with_has_shadow`, `with_transparent` — floating card look
- `with_drag_and_drop(true)` — archives dropped anywhere (parity kept)

iced `window::Settings` (verified 0.14.0) stops at `decorations`,
`transparent`, `blur` — a custom titlebar is still buildable, but the
traffic-light overlay + drag-region behavior needs winit escape hatches
in both; only egui documents the macOS path.

Shared (both winit-based, no differentiator): `rfd` file/folder
pickers, `muda` global menus, `arboard` clipboard, `open` reveal-in-
Finder, `dark-light` system-theme detection. Dock badge: `tauri`-only
today, needs a tiny crate or `cocoa` call in either.

## 3. Theming + component richness

egui theming is a struct mutation:

```rust
let mut v = egui::Visuals::dark();   // or ::light()
v.panel_fill = egui::Color32::from_hex("#1e1e1e").unwrap();
v.widgets.noninteractive.fg_stroke = egui::Stroke::new(1.0, TEXT);
v.window_corner_radius = 13.into();
ctx.set_visuals(v);
```

36 fields, per-widget state styles (`Widgets`), per-`Ui` scoping,
serializable (persist user themes for free). Our 8-accent + 3-theme
system ports to one `fn quarkzip_visuals(accent, mode) -> Visuals`.

iced theming is broader out of the box (23 themes incl. Nord, Dracula,
Catppuccin, TokyoNight) but custom looks mean `Catalog` closures per
widget per state — the flexible-but-verbose pattern from their own docs:

```rust
button("Go").style(|theme: &Theme, status| match status {
    button::Status::Active => button::Style::default()
        .with_background(palette.success.strong.color),
    _ => button::primary(theme, status),
})
```

Multiply by every widget × 4 states. For a bespoke macOS design system,
egui's flat struct wins on both reading and writing.

Component count favors iced (~40: table, combo_box, pick_list,
text_editor, markdown, tooltip, qr_code, canvas… vs egui core +
`egui_extras`). But count the widgets an archive manager uses:
buttons, checkboxes (tri-state — both need hand-rolling), text fields,
progress bars, menus, dialogs, tooltips, scroll areas. egui covers all;
the exotic iced widgets (qr, markdown, canvas) buy us nothing. Neither
ships a tree — both need the hand-rolled virtualized one, which is
strictly easier in immediate mode (see §5).

## 4. DX: verbosity (the rapid-development axis)

Same counter. egui (from their own docs):

```rust
fn ui_counter(ui: &mut egui::Ui, counter: &mut i32) {
    ui.horizontal(|ui| {
        if ui.button("−").clicked() { *counter -= 1; }
        ui.label(counter.to_string());
        if ui.button("+").clicked() { *counter += 1; }
    });
}
```

iced (from their own pocket guide): a `Message` enum + `update` fn +
`view` fn + `Element` plumbing — ~3× the lines before any layout, and
every new interaction (expand, check, page, sort) extends the enum and
every `match`. For a dialog-heavy app (extract/test/checksum/password/
permission/about/progress), Elm boilerplate scales with interaction
count; immediate-mode scales with widget count. Our app is interaction-
dense: egui fits.

Sketch of our virtualized tree row in egui (the whole per-row logic —
guides, chevron, checkbox, icon, name, type, size, date — is one linear
block inside `show_rows`, no messages, no commands):

```rust
scroll.show_rows(ui, ROW_H, total, |ui, range| {
    for i in range {
        let node = &visible[i];
        ui.horizontal(|ui| {
            ui.label(guides_for(node));            // ├── │ └── text
            if ui.small_button(if open {"▼"} else {"▶"}).clicked() {
                toggle_expand(node);               // plain function call
            }
            let mut checked = selected.contains(node);
            if ui.checkbox(&mut checked, "").changed() {
                toggle_check(node, checked);       // plain function call
            }
            ui.label(name); ui.label(kind); ui.label(size);
        });
    }
});
```

Backend chunk fetch = `std::thread::spawn` + `ctx.request_repaint()`
(or `poll_promise`); no `Task`/`Subscription` runtime to learn.

## 5. Performance, compile, binary, battery

- Runtime: both GPU-rendered (egui `glow` or `wgpu`; iced `wgpu`), both
  idle at ~0 CPU on static UI (egui repaints on demand despite the
  "redraws every frame" myth — nothing repaints without input/timers).
  Lukas Kalbertodt's Tauri-vs-iced-vs-egui measurements put iced ≈ egui
  on startup/resize, both ahead of Tauri.
- Compile: egui+`glow` is famously light; eframe's `wgpu` backend
  "doubles" it (egui#4481). iced always pays `wgpu` + `cosmic-text` —
  expect multi-minute clean builds; incremental is fine in both.
- Binary: egui hello-world ≈ 2–5MB; iced ≈ 8–15MB (fonts/shaders).
  Neither matters next to our 7-Zip sources, but smaller is smaller.
- Memory at 10M: identical backend (`Vec<EntryFacts>` + chunk IPC
  becomes chunk function calls); frontend holds one 10k window in both.
  egui wins only by making the window trivial to write.

## 6. Risks, stated plainly

- egui breaks API every release ("heavy development" per its own docs;
  0.36 today). Pin versions, budget migration hours per upgrade. iced
  0.14 is calmer but pre-1.0 too.
- egui default visuals scream "game debug UI" — the macOS theme is a
  real workstream (2–4 days for our token set), not an afternoon.
- AccessKit ≠ perfect VoiceOver; it beats iced's nothing, but budget a
  pass with a screen reader before claiming "best-in-class".
- CJK archive names need a bundled Noto CJK font (+~10MB, one
  `FontDefinitions` call). Non-negotiable for a file tool.
- Playwright e2e dies with the DOM. Replacement: `egui_kittest`
  headless UI tests + Rust unit tests + screenshot goldens. Our
  "unit + e2e pins per fix" rule becomes "unit + kittest pins".
- `eframe` persistence covers window state; app prefs (theme/accent/
  collapse) move to a small serde JSON file — simpler than today.

## 7. What stays, what gets rewritten

STAYS (untouched Rust): `src-tauri/ffi/bridge.*` (7-Zip engine),
`src-tauri/src/sevenzip.rs`, `archive.rs` facts/sort/`children_of`/
counts/index (drop the Tauri `State` wrapper, call directly),
extract/test/checksum/permission error taxonomy, `vendor/7zip`.

REWRITTEN: all of `src/` (React) → one `qz-ui` egui crate:
`CentralPanel` tree (virtualized), overview card, titlebar strip
(custom, via the ViewportBuilder knobs above), dialogs as `Window`s,
footer, theme/accent `Visuals` builder, i18n via `fluent` or `rust-i18n`
(EN/HI parity check becomes a Rust test). Tauri IPC evaporates into
function calls — the entire `get_children` round-trip becomes
`children_of(&facts, …)`.

Suggested milestones: (1) spike — eframe shell + themed tree over the
real 10M fixture, measure; (2) dialogs + extract flows; (3) prefs/i18n/
permissions parity; (4) dmg packaging (`cargo-bundle`/`create-dmg`),
kittest suite; (5) Linux pass (later, per scope).

## Verdict

**egui.** Virtualization is a primitive, not a project; macOS chrome is
documented, not hacked; theming is a struct, not a closure tree; and
interaction-dense UI is functions, not enums. iced is the better
_component catalog_ and the better _text engine_, but neither advantage
moves our workload — while egui's three structural advantages (windowing,
chrome knobs, terse interaction code) are exactly our three pain points.
