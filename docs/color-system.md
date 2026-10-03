# QuarkZip color system

Brand: rose/maroon (Coolors Palette 1) harmonized with the pink zipper logo;
mist neutrals (Palette 5) for light surfaces. Rejected: pastels (low contrast),
neon pink-purple-blue (fights the logo), deep purples (wrong hue family).

Validated with [`jakubkrehel/better-colors`](https://www.ui-skills.com/skills/jakubkrehel/better-colors/)
(OKLCH/contrast/token rules). All ratios below were computed from the declared
token pairs — never eyeballed.

## Tokens (`src/index.css`)

Components reference `--qz-*` role tokens only, never raw hex.

| Token          | Light     | Dark      | Role                              |
| -------------- | --------- | --------- | --------------------------------- |
| `--qz-bg`      | `#fff0f3` | `#160309` | page background (dark derived)    |
| `--qz-surface` | `#ffffff` | `#2a0a12` | cards, popovers, toggle pill      |
| `--qz-border`  | `#ffccd5` | `#800f2f` | borders, separators               |
| `--qz-text`    | `#590d22` | `#fff0f3` | body text                         |
| `--qz-muted`   | `#800f2f` | `#ffb3c1` | secondary text                    |
| `--qz-primary` | `#c9184a` | `#ff4d6d` | primary fills (one action per view)|
| `--qz-accent`  | `#ff4d6d` | `#ff8fa3` | highlights, never body text       |

Switching: single `.dark`-class mechanism on `<html>` (Tailwind custom
variant `@custom-variant dark`), plus `color-scheme` for native controls.
`System` choice follows `prefers-color-scheme` live. Cross-fade 0.35s.

## Measured contrast (2026-10-03)

| Pair | Ratio | Needs | Result |
| ---- | ----- | ----- | ------ |
| light body `#590d22` on `#fff0f3` | 12.63:1 | 4.5 | PASS |
| light muted `#800f2f` on `#fff0f3` | 9.38:1 | 4.5 | PASS |
| light white on primary `#c9184a` | 5.66:1 | 4.5 | PASS |
| light white on accent `#ff4d6d` | 3.21:1 | 3.0 | PASS (large/UI only) |
| dark body `#fff0f3` on `#160309` | 18.09:1 | 4.5 | PASS |
| dark muted `#ffb3c1` on `#160309` | 11.86:1 | 4.5 | PASS |
| dark bg-text `#160309` on primary `#ff4d6d` | 6.22:1 | 4.5 | PASS |

Known failure, fixed by usage rule: **white on `#ff4d6d` is 3.21:1 and
fails AA body text in dark mode** — dark-mode primary fills always pair
with `#160309` text, never white (see `ThemeSwitch.tsx` active pill).

## Rules

1. One hue, one meaning: rose encodes primary/interactive. No second accent
   hue (the `blue-600` toggle pill was removed for this reason).
2. Never borrow a token outside its role (separator as text, accent as body).
3. Dark ramp is hand-built, not a mechanical reverse; recheck every pair
   after any token change and re-record the table above.
4. Keep annotated `const X: T[] = [...]` in `.ts` files — the `vite:oxc`
   transform under `vitest --coverage` rejects it inside `.tsx`.
