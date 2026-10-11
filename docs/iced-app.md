# iced app (`iced-app/`) — comparison build

Same compact CRM shell as `egui-app/` (same tokens, same mock content, same
screens), rebuilt in iced 0.14 Elm architecture so the two can be compared
side by side on `develop`.

## Run

```sh
cd iced-app
cargo run --release
```

## Structure

| File            | Role                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/main.rs`   | `iced::application` boot/update/view, transparent window, 1440×900                                                        |
| `src/tokens.rs` | Same ReferenceUi palette as egui (alpha surfaces) + custom `Theme` from `Palette`                                         |
| `src/data.rs`   | Same mock domain (KPIs, van schedule, table groups, avatars)                                                              |
| `src/app.rs`    | `App` state + `Message` enum + `update` + `view`: sidebar, Today, Jobs table, drawer, Settings, both modals, placeholders |

## iced notes (0.14, verified against vendored sources)

- Boot is `application(boot, update, view)` with `Task`, not `Command`.
- Styling is per-widget `Catalog` closures (`button::Status`,
  `text_input::Status`); containers take a single-arg closure. Shared looks
  live in `*_style()` helpers returning `Style` structs.
- Rows are `mouse_area` (zero chrome, exact content size); nav items are
  real buttons. Overlays compose with `Stack::from_vec` (dim +
  drawer/modal on top); backdrop click closes.
- `Radius` is per-corner `f32` (drawer rounds left corners only);
  `Padding` is a `{ top, right, bottom, left }` struct; table columns use
  `FillPortion` weights that sum to 100.
- Helpers that size content return builders (`Column`, `Text`), not
  `Element` — `Element` has no `.width()`. By-value `Job` (all fields
  `Copy`/`'static`) keeps the borrow checker quiet across rows.

## Known deltas vs the egui build

- Default font rendering differs (iced uses system fonts via cosmic-text —
  better CJK coverage for free).
- No hover highlight on table rows yet (mouse_area has no hover style;
  a `button`-based row or custom hover state is the follow-up).
- Shadows are `Shadow::default` (theme-derived); the soft modal/drawer
  shadows from the spec are a follow-up.
- Transparency works the same way (transparent framebuffer + alpha
  surfaces); compare backdrop bleed between the two windows.
