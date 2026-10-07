# QuarkZip color system

Native macOS semantic palette (Tahoe-era): AppKit roles
approximated for the webview — Apple says never hard-code system values
and always go through semantic APIs; here CSS custom properties ARE that
API. Window/control backgrounds, label hierarchy, separator, and the
8-color system accent set. Replaces the former warm-neutral SaaS ramp
(2026-10-07: fought the native feel, green CTA is not a macOS pattern —
prominent buttons take the accent fill).

Ratios below are measured outputs of `scripts/contrast-check.py`
(gate: AA 4.5 for every text pair) — never eyeballed.

## Tokens (`src/index.css`)

Components reference `--qz-*` role tokens only, never raw hex.

| Token                                                   | Light                             | Dark                              | Role                                                      |
| ------------------------------------------------------- | --------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `--qz-bg`                                               | `#ececec`                         | `#1e1e1e`                         | window / frame background                                 |
| `--qz-surface`                                          | `#ffffff`                         | `#282828`                         | cards, controls                                           |
| `--qz-surface-2`                                        | `#f5f5f7`                         | `#323232`                         | soft fills, tracks, hovers                                |
| `--qz-border`                                           | `#c6c6c8`                         | `#4a4a4a`                         | separators (opaque, never text)                           |
| `--qz-text`                                             | `#000000`                         | `#ffffff`                         | labelColor body text                                      |
| `--qz-muted`                                            | `#3c3c43`                         | `#ebebf5`                         | secondaryLabel, full-strength for AA                      |
| `--qz-faint`                                            | `#6e6e73`                         | `#98989f`                         | micro-labels ONLY (see rule 5)                            |
| `--qz-accent`                                           | system hue                        | system hue                        | raw accent (selection tint, focus ring)                   |
| `--qz-primary` / `-hover` / `-soft` / `--qz-on-primary` | per-accent table below            | per-accent table below            | CTA fills (accent-driven)                                 |
| `--qz-success` / `-soft`                                | `#1f7a33` / `#e5f2e7`             | `#4cc38a` / `#14291f`             | success pills                                             |
| `--qz-info` / `-soft` / `-dot`                          | `#0b5bd3` / `#e8f0fe` / `#0b5bd3` | `#82aaff` / `#16233d` / `#82aaff` | info pills                                                |
| `--qz-warning` / `-soft` / `-dot`                       | `#8a4d00` / `#fff1dd` / `#b36200` | `#e8a33d` / `#33270f` / `#e8a33d` | warning pills                                             |
| `--qz-danger` / `-soft`                                 | `#c92a22` / `#fdeceb`             | `#ff6961` / `#3a1f1e`             | danger pills, errors                                      |
| `--qz-bar-bg`                                           | `rgba(236,236,236,0.72)`          | `rgba(30,30,30,0.72)`             | translucent chrome fill (see materials)                   |
| `--qz-frame-bg`                                         | `rgba(236,236,236,0.12)`          | `rgba(30,30,30,0.2)`              | glass wash on frame only (§8 in macos-native)             |
| `--qz-glass-text` / `-muted`                            | `#000000` / `#3c3c43`             | same (theme-independent)          | mac title strip only — live-wallpaper backdrop, not gated |

## Accent system (`data-accent`, default blue)

Eight macOS accents. `--qz-accent` is the raw system hue (rings,
selection, toggles — never body text). `--qz-primary*` is the AA-tuned
CTA ramp derived from it; dark on-accent is black so vivid fills keep
their hue while passing (white text on system brights fails — Apple ships
it anyway; we don't). Hover fills are checked with their own text color.

| Accent   | Light fill / hover / on       | Dark fill / hover / on        |
| -------- | ----------------------------- | ----------------------------- |
| blue     | `#0070eb` / `#005fc7` / white | `#0a84ff` / `#0072e5` / black |
| purple   | `#5e5ce6` / `#3f3de1` / white | `#7d7aff` / `#7676ff` / black |
| pink     | `#ea002d` / `#c60026` / white | `#ff375f` / `#ff1342` / black |
| red      | `#ed0d00` / `#c90b00` / white | `#ff453a` / `#ff2316` / black |
| orange   | `#b36200` / `#8f4e00` / white | `#ff9f0a` / `#e58b00` / black |
| yellow   | `#9c7a00` / `#a88700` / black | `#ffd60a` / `#e5bf00` / black |
| green    | `#23863b` / `#1c6a2f` / white | `#30d158` / `#28b54b` / black |
| graphite | `#6e6e73` / `#5d5d61` / white | `#98989f` / `#86868e` / black |

Switching: `.dark`-class mechanism on `<html>` (Tailwind custom variant
`@custom-variant dark`) × `data-accent`, plus `color-scheme` for native
controls. `System` theme follows `prefers-color-scheme` live. Theme
cross-fade 180ms. No accent switcher UI yet — `data-accent` defaults to
blue; the switcher is tracked follow-up work.

## Measured contrast (`scripts/contrast-check.py`, 44/44 PASS)

| Pair                                    | Ratio        | Needs | Result                                |
| --------------------------------------- | ------------ | ----- | ------------------------------------- |
| light body `#000` on `#ececec`          | 17.78:1      | 4.5   | PASS                                  |
| light muted `#3c3c43` on `#ececec`      | 9.26:1       | 4.5   | PASS                                  |
| light success/info/warning/danger pills | 4.68–6.01:1  | 4.5   | PASS                                  |
| light CTA fills + hovers, all accents   | 4.50–7.08:1  | 4.5   | PASS                                  |
| dark body `#fff` on `#1e1e1e`           | 16.67:1      | 4.5   | PASS                                  |
| dark muted `#ebebf5` on `#1e1e1e`       | 14.08:1      | 4.5   | PASS                                  |
| dark success/info/warning/danger pills  | 5.34–6.94:1  | 4.5   | PASS                                  |
| dark CTA fills + hovers, all accents    | 4.54–14.88:1 | 4.5   | PASS                                  |
| light faint `#6e6e73` on `#ececec`      | 4.29:1       | 4.5   | restricted micro-labels only (rule 5) |
| dark faint `#98989f` on `#1e1e1e`       | 5.82:1       | 4.5   | PASS                                  |

## Rules

1. One hue, one meaning: accent encodes interaction (CTA, selection,
   focus, toggles); green/blue/amber/red encode status only. No second
   accent hue; never body text in accent.
2. Never borrow a token outside its role (separator as text, accent as body).
3. Dark ramp is hand-built, not a mechanical reverse; recheck every pair
   after any token change and re-record the table above.
4. Danger is never a solid red button — quiet text or soft pill only
   (delete confirmation is the sole exception and has no such UI yet).
5. `--qz-faint` is 11–12px uppercase micro-labels, placeholders, and
   decorative icons only. Never body, secondary, or values.
6. Liquid Glass only as the native window background (`NSGlassEffectView`
   via `apply_window_glass`, macOS; §8 in macos-native.md) — never CSS
   imitation, never on content, cards, or controls. Chrome shells stay
   standard materials (`.qz-material-bar`), content stays solid. See
   `docs/macos-native.md` for the full native-direction brief.
7. Keep annotated `const X: T[] = [...]` in `.ts` files — the `vite:oxc`
   transform under `vitest --coverage` rejects it inside `.tsx`.
