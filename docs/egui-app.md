# egui app (`egui-app/`) — QuarkZip in pure Rust

The Tauri app's archive manager UI (`src/`, React) ported to egui/eframe on
`develop`, running the **same in-process 7-Zip engine**: `archive.rs` +
`sevenzip.rs` are shared by path from `src-tauri/src/` (never forked) and
the vendored `vendor/7zip` + bridge compile here via `build.rs`. Only the
Tauri command layer is re-expressed as threads + channels (`engine.rs`).

## Run

```sh
cd egui-app
cargo run --release
```

## Structure

| File               | Ports                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main.rs`      | 800×675 transparent viewport, traffic lights over a 92px strip, drag-and-drop                                                                                            |
| `src/app.rs`       | `App.tsx`: open flow, extract/test/checksum/password/permission state machines, titlebar, footer, worker polling                                                         |
| `src/tree.rs`      | `ArchiveTree.tsx`: virtualized `show_rows`, 10k worker-thread chunks, per-folder pager, prefix-collapse selection, keyboard + typeahead, skeletons, counts, index column |
| `src/overview.rs`  | `ArchiveOverview.tsx`: empty CTA card, 16-cell metadata grid, More/Less, centered action row, inline theme/language controls                                             |
| `src/dialogs.rs`   | Load / Extract / Done+Reveal / About / Test / Checksum / Password / Permission                                                                                           |
| `src/engine.rs`    | `src-tauri/src/lib.rs` flows: list/extract/test workers, sync checksum (same digest crates), rfd pickers, `open -R` reveal                                               |
| `src/theme.rs`     | `src/index.css`: light/dark × 8 accents, persisted with lang + collapse in `~/.config/quarkzip-egui.json`                                                                |
| `src/i18n.rs`      | EN/HI tables (155 keys, unit-pinned parity) + `{name}` interpolation                                                                                                     |
| `src/fmt.rs`       | `format.ts`: IEC sizes, locale counts (Hindi: Devanagari + Indian grouping), engine stamps as local wall time                                                            |
| `src/file_kind.rs` | `fileKind.ts`: extension table, filename-only extensions                                                                                                                 |
| `src/selection.rs` | `treeSelection.ts`: prefix-collapse set, split-on-uncheck, guides algorithm (pinned)                                                                                     |
| `src/widgets.rs`   | Buttons/cards/pills/progress/skeletons/dialog shell + painted glyphs (guides, chevrons, checks, folder, lock, shield — no icon font)                                     |
| `src/prefs.rs`     | JSON prefs (theme/accent/lang/collapsed)                                                                                                                                 |

## Deliberate v1 gaps

1. Inter font (egui default; CJK needs bundled Noto).
2. No blur behind translucent chrome/dialog veils (alpha only — egui has no backdrop-filter).
3. Chunk counts rescan per folder open (upstream memoizes per listing).
4. No kittest pins yet (Playwright dies with the DOM).
5. Accent dots lack sliding indicator; theme/language expand inline, not in popups.
