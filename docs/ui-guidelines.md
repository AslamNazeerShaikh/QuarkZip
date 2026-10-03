# QuarkZip UI guidelines

Distilled from the Brightway reference analysis
(`CollegeAdmissionManagementSystem/docs/ReferenceUi/Reference-UI-Analysis.md`
+ `UiPrompt.md`). That analysis is the visual source of truth; this file maps
it onto QuarkZip. When uncertain: lighter border, softer shadow, more
whitespace, smaller icon, less bold.

## Design direction

Premium native desktop app: clean, calm, restrained, spacious. Soft neutral
backgrounds, minimal shadows, thin borders, medium-weight typography, rounded
controls, single thin outline icon set (Lucide, 16–20px, quiet gray).

Explicit non-goals: Material/Bootstrap/admin-dashboard look, gradients,
glassmorphism (no blur/translucency anywhere), neon, heavy shadows, 2px dark
borders, vertical table gridlines, bold-everything type, dark-mode-by-default
(dark exists via the theme switch but light is home).

## Tokens

Palette, roles, and measured contrast live in `docs/color-system.md`.
Supporting scales (all from the reference):

- Spacing (8px grid): `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`.
  One rhythm everywhere: 28px horizontal page margins, 28px gap between the
  two cards, 28px above/below the action bar (`px-7` / `gap-7` / `py-7`).
  Card internals keep their own padding (`px-5` + `py-4/5`).
- Radius ladder: window/overlay 20 → card 13 → input/button 9–10 →
  nav/segment 8 → pill/avatar 999/50%. Never one radius everywhere.
- Shadows: cards `0 1px 2px rgba(0,0,0,.03)` only; floating controls reuse
  the card shadow; overlays use soft large elevation. No `shadow-lg`.
- Motion: 180ms ease-out everywhere (theme cross-fade, indicator slide,
  scrollbar fade).

## Typography (Inter, OFL)

| Use | Spec |
| --- | ---- |
| Card title | 16px, 600 |
| Body / value | 14px (`text-sm`), 400–500 |
| Secondary | 13px, `--qz-muted` |
| Micro-label (column headers, meta labels) | 11px, 600, uppercase, `tracking-[0.06em]`, `--qz-faint` |
| Tertiary / hint | 12px (`text-xs`), `--qz-faint` |

Numbers: comma thousands via `toLocaleString("en-US")`, sizes via
`formatSize` (IEC `KiB…`), `·` joins meta, never `|` or `/`.

## Components (`src/components/ui/` + feature components)

shadcn-style API (`variant` + `size`), reference tokens underneath:

- `Button`: primary = solid green CTA h-10, 9px radius, 14px/500
  (`--qz-on-primary` text both modes); secondary = surface + 1px border;
  ghost = text-only. One primary action per view.
- `Card`: surface, 13px radius, 1px border, card shadow. `CardTitle` 16/600,
  `CardDescription` 13px muted, content scrolls internally (`min-h-0`).
- `Badge`: StatusPill language — 999px, 11px/600, 6px dot + text.
  Variants neutral/success/info/warning/danger, AA pairs in color-system doc.
- `Separator`: 1px `--qz-border`, no verticals.
- `ArchiveTable`: card container (13px radius), 11px uppercase headers,
  horizontal separators only, checkbox multi-select with soft primary-tint
  selection, right-aligned tabular totals, native slim scrollbar
  (`.scroll-slim`), empty state centered on both axes,
  reference empty state (16px icon + 14px gray text + 12px hint).
- `Pagination` / `ThemeSwitch`: solid surface, 10px radius, card shadow,
  8px inner radii. Segmented behavior (sliding indicator) preserved.
- Action bar (`App.tsx` footer, in normal flow below the table — nothing
  floats or overlaps): left = `Browse…` + destination chooser (defaults to
  the archive's own folder, native directory picker to change) + green
  `Extract` CTA + inline `role="status"` result; right = `Pagination` +
  `ThemeSwitch`. Extract runs `extract_archive` (`7zz x -o<dest> -y`).
- `ArchiveOverview`: the 50% overview card — centered empty state
  (icon tile + title + description + primary CTA + hint), metadata in
  4-column grids once open (micro-label + 14px medium value, block centered
  on both axes via `m-auto`), progressbar with
  `aria-valuenow` for the compression ratio. Columns: Name flexes, Modified
  is fixed at `w-56`.

## Layout

Single window (990×660 default, Tauri `tauri.conf.json`), no sidebar: slim
drag strip (`h-14`), then a 50/50 vertical split — `ArchiveOverview`
(`flex-[1_1_50%]`) above, table (`flex-[1_1_50%]`) below — then the action
bar, all on the 28px rhythm. Panels scroll internally, never the page. The
table scroller carries no bottom padding, so at max scroll the last row
lands exactly on the viewport bottom (no dead zone), with or without
pagination.

## Interaction / states

- Drag-drop anywhere opens archives; hover shows a dotted primary overlay
  (window-radius 20px). Errors are quiet danger text, never toasts.
- Loading: inline gray copy ("Reading…"), never layout shift.
- Empty: centered icon + gray text in the same card language.
- Keyboard: every control is a real button/input/select with visible
  `focus-visible` primary ring; Esc/outside-click closes the theme switch.
- Selection without dropdowns when N≤3 (theme Light/System/Dark segmented);
  dropdowns only for long lists (page sizes).

## Deliberate deviations (with rationale)

1. Table rows are 36px single-line, not the reference 60–76px two-line —
   archives hold 10k+ entries, so rows are virtualized and density is a
   performance requirement. Headers, separators, selection, and empty-state
   language still follow the reference.
2. Dark mode exists (reference has none) via the same token roles;
   the dark ramp is hand-built and contrast-checked, not inverted.
3. Pill info text is `#2f5fc4`, darkened from reference `#3D73D9`, so the
   badge pair passes AA (dot keeps brand blue).
