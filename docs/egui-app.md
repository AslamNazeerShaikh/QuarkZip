# egui app (`egui-app/`) — develop-branch scaffold

First egui milestone: the compact CRM visual foundation from
`CollegeAdmissionManagementSystem/docs/ReferenceUi`
(`Reference-UI-Analysis.md` + `UiPrompt.md`), rebuilt as a pure-Rust
egui/eframe app with a macOS-native transparent window.

## Run

```sh
cd egui-app
cargo run --release
```

(release: wgpu shader compile stutters less; dev profile sets `opt-level = 1`
as a halfway house.)

## Structure

| File             | Role                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.rs`    | Transparent viewport: decorations on (traffic lights kept), titlebar hidden, fullsize content view, shadow, background-drag, drag-and-drop                           |
| `src/tokens.rs`  | Single design-token set: warm neutrals + alpha per surface (sidebar most translucent, cards near-opaque), 8px grid, radius ladder, type scale, base `Visuals`        |
| `src/data.rs`    | Mock domain (KPIs, van schedule, table groups, avatar colors). Shapes mirror the analysis doc so real data drops in without touching views                           |
| `src/widgets.rs` | Shared primitives: pill, avatar, nav item, buttons, search, KPI card, segmented, tag, stop circle, stepper, empty state                                              |
| `src/app.rs`     | AppShell (300px sidebar, ⌘K search, badges, BUSINESS section, footer meta) + Today dashboard + Jobs table + detail drawer + Settings + New-job / New-customer modals |

## macOS notes

- Traffic-light strip: sidebar and pages reserve `TITLEBAR_PAD` (30px) at
  the top; content flows under the clear titlebar via fullsize content view.
- Real vibrancy blur (`NSVisualEffectView`) is unreachable from pure egui —
  translucency is alpha compositing, strongest on the sidebar. If(enough
  users ask, a `cocoa`/`objc2` blur view behind a more transparent frame is
  the escape hatch.
- Glyph discipline: only Latin-1 punctuation (£ · – ×) as text; dots,
  checks, and circles are painted shapes (bundled fonts lack ●/✓/○).

## Deliberate v1 gaps (next milestones)

1. Inter font bundling (closest open metric match to SF Pro; needs TTFs).
2. Lucide-style line icons (`egui-phosphor` or custom paths) — nav, section
   labels, and empty states are text-only today.
3. Route-map placeholder → real canvas drawing.
4. Real model layer: replace `data.rs` mocks; per-row Save actually saves.
5. Archive-domain wiring: reuse `src-tauri` 7-Zip core (facts/children
   logic) behind a core lib crate; virtualize the table with
   `ScrollArea::show_rows` for 10M-entry listings.
6. Keyboard: Esc closes overlays, ⌘K focuses search, focus trap in modals.
7. `egui_kittest` headless UI pins (Playwright dies with the DOM).
