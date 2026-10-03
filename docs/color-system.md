# QuarkZip color system

Warm-neutral reference palette (Brightway analysis): calm SaaS neutrals with
scarce color — green CTA, red danger, blue/orange identity accents. Everything
else is warm gray + near-black text. Replaces the former rose/maroon brand
ramp (removed 2026-10-03: fought the neutral system, duplicated primary hues).

Ratios below were computed from the declared token pairs with the WCAG
relative-luminance formula — never eyeballed.

## Tokens (`src/index.css`)

Components reference `--qz-*` role tokens only, never raw hex.

| Token               | Light     | Dark      | Role                              |
| ------------------- | --------- | --------- | --------------------------------- |
| `--qz-bg`           | `#f7f6f3` | `#191614` | page background                   |
| `--qz-surface`      | `#ffffff` | `#221f1c` | cards, controls                   |
| `--qz-surface-2`    | `#fbfbfa` | `#292524` | soft fills, tracks, hovers        |
| `--qz-border`       | `#e7e7e3` | `rgba(255,255,255,0.1)` | borders, separators |
| `--qz-text`         | `#171717` | `#f5f4f1` | body text                         |
| `--qz-muted`        | `#666666` | `#a8a29e` | secondary text                    |
| `--qz-faint`        | `#8a8a8a` | `#78716c` | micro-labels ONLY (see rule 5)    |
| `--qz-primary`      | `#147a5a` | `#3aa57f` | primary fills (one action per view)|
| `--qz-primary-hover`| `#0f6248` | `#4fbf94` | primary hover                     |
| `--qz-primary-soft` | `#e7f5ed` | `rgba(58,165,127,0.15)` | tinted tiles, selected rows |
| `--qz-on-primary`   | `#ffffff` | `#101613` | text on primary fills             |
| `--qz-accent`       | `#3d73d9` | `#7aa5e8` | identity accents, never body text |
| `--qz-success` / `-soft` | `#147a5a` / `#e7f5ed` | `#3aa57f` / `#1e2e28` | success pills |
| `--qz-info` / `-soft`    | `#2f5fc4` / `#edf3ff` | `#7aa5e8` / `#1e2a3f` | info pills    |
| `--qz-warning` / `-soft` | `#9a5b0b` / `#fff3e4` | `#e8a33d` / `#33270f` | warning pills |
| `--qz-danger` / `-soft`  | `#a94444` / `#fbecec` | `#e08a8a` / `#382222` | danger pills, errors |
| `--qz-info-dot` / `--qz-warning-dot` | `#3d73d9` / `#d97a18` | = text color | pill dots (non-text brand hues) |

Notes:

- Light `--qz-info` is `#2f5fc4`, darkened from the reference `#3D73D9` so the
  pill pair passes AA (4.05 → 5.31). The dot keeps brand `#3D73D9`.
- Light `--qz-warning` text is `#9a5b0b` (AA 4.95); the dot keeps `#D97A18`.
- Dark `--qz-warning` soft is a brown-black `#33270f` so amber text passes.

Switching: single `.dark`-class mechanism on `<html>` (Tailwind custom
variant `@custom-variant dark`), plus `color-scheme` for native controls.
`System` choice follows `prefers-color-scheme` live. Theme cross-fade 180ms.

## Measured contrast (2026-10-03)

| Pair | Ratio | Needs | Result |
| ---- | ----- | ----- | ------ |
| light body `#171717` on `#f7f6f3` | 16.59:1 | 4.5 | PASS |
| light muted `#666666` on `#f7f6f3` | 5.31:1 | 4.5 | PASS |
| light faint `#8a8a8a` on `#f7f6f3` | 3.19:1 | 4.5 | FAIL — micro-labels only (rule 5) |
| light on-primary `#ffffff` on `#147a5a` | 5.30:1 | 4.5 | PASS |
| light success `#147a5a` on `#e7f5ed` | 4.72:1 | 4.5 | PASS |
| light info `#2f5fc4` on `#edf3ff` | 5.31:1 | 4.5 | PASS |
| light warning `#9a5b0b` on `#fff3e4` | 4.95:1 | 4.5 | PASS |
| light danger `#a94444` on `#fbecec` | 5.09:1 | 4.5 | PASS |
| dark body `#f5f4f1` on `#191614` | 16.37:1 | 4.5 | PASS |
| dark muted `#a8a29e` on `#191614` | 7.14:1 | 4.5 | PASS |
| dark faint `#78716c` on `#191614` | 3.75:1 | 4.5 | FAIL — micro-labels only (rule 5) |
| dark on-primary `#101613` on `#3aa57f` | 5.99:1 | 4.5 | PASS |
| dark success `#3aa57f` on `#1e2e28` | 4.65:1 | 4.5 | PASS |
| dark info `#7aa5e8` on `#1e2a3f` | 5.74:1 | 4.5 | PASS |
| dark warning `#e8a33d` on `#33270f` | 6.77:1 | 4.5 | PASS |
| dark danger `#e08a8a` on `#382222` | 5.75:1 | 4.5 | PASS |

## Rules

1. One hue, one meaning: green encodes primary/success, blue info/identity,
   amber warning/encryption, red danger/errors. No second accent hue.
2. Never borrow a token outside its role (separator as text, accent as body).
3. Dark ramp is hand-built, not a mechanical reverse; recheck every pair
   after any token change and re-record the table above.
4. Danger is never a solid red button — quiet text or soft pill only
   (delete confirmation is the sole exception and has no such UI yet).
5. `--qz-faint` fails AA body text by design: 11–12px uppercase micro-labels,
   placeholders, and decorative icons only. Never body, secondary, or values.
6. Keep annotated `const X: T[] = [...]` in `.ts` files — the `vite:oxc`
   transform under `vitest --coverage` rejects it inside `.tsx`.
