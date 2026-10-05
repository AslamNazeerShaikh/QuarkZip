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
  One rhythm everywhere: 28px gutters on the content sides/bottom, no top
  pad (card sits under the title strip), 28px gap between the two cards
  and above the action bar (`px-7`/`pb-7`/`gap-7`/`pt-7`).
  Card internals keep their own padding (`px-5` + `py-4/5`). The
  drag-drop frame is window-fixed at `inset-3.5` (14px) — top edge in the
  title strip, other edges centered in the content gutters — identical
  from all sides and independent of content padding.
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
| Window title (centered drag strip) | 13px, app name 600 + ` | ` + muted full path, ellipsis |
| Body / value | 14px (`text-sm`), 400–500 |
| Secondary | 13px, `--qz-muted` |
| Micro-label (column headers, meta labels) | 11px, 600, uppercase, `tracking-[0.06em]`, `--qz-faint` |
| Tertiary / hint | 12px (`text-xs`), `--qz-faint` |

Numbers: comma thousands via `toLocaleString("en-US")`, sizes via
`formatSize` (IEC `KiB…`), stamps via `formatModified`/`formatDateTimeLocal`
(system time zone, AM/PM, `en-US` shape), `·` joins meta, never `|` or `/`.
Window title follows the open archive: `QuarkZip | "Path: <full path>"`
(plain `QuarkZip` otherwise; `setWindowTitle`, best-effort), centered in the
drag strip with ellipsis.

## Components (`src/components/ui/` + feature components)

shadcn-style API (`variant` + `size`), reference tokens underneath:

- `Button`: primary = solid green CTA h-10, 9px radius, 14px/500
  (`--qz-on-primary` text both modes); secondary = surface + 1px border;
  ghost = text-only. Sizes default/`sm`/`bar` (36px footer height matching
  the Pagination/ThemeSwitch shells)/icon. One primary action per view.
- `Card`: surface, 13px radius, 1px border, card shadow. `CardTitle` 16/600,
  `CardDescription` 13px muted, content scrolls internally (`min-h-0`).
- `Badge`: StatusPill language — 999px, 11px/600, 6px dot + text.
  Variants neutral/success/info/warning/danger, AA pairs in color-system doc.
- `Separator`: 1px `--qz-border`, no verticals.
- `ArchiveTable`: card container (13px radius), checkbox + `#` serial column
  (1-based across the sorted dataset, stable under paging), header row fixed
  to the 36px row height with 12px uppercase labels synced with their cells
  (Name left; Type/Size/Modified centered
  both axes), Size fixed at `w-32` (fits the longest `formatSize` output —
  7 chars — with slack, no ellipsis), Modified fixed at `w-64` showing the full local stamp
  (`formatModified`: system time zone, AM/PM, raw stamp on hover),
  horizontal separators only, checkbox multi-select with soft primary-tint
  selection, native slim scrollbar (`.scroll-slim`), empty state centered on
  both axes. The listing never contains the archive itself: `parse_list_slt`
  skips the header block before the `----------` separator, so only real
  files/folders appear.
  reference empty state (16px icon + 14px gray text + 12px hint).
- `Pagination` / `ThemeSwitch`: solid surface, 10px radius, card shadow,
  8px inner radii. Segmented behavior (sliding indicator) preserved.
  The page-size menu hugs its trigger (`left-0`, `w-max min-w-full`, 8px
  gap) with option text insets matching the trigger (`px-2`), so list
  edges and text align with the control below. The footer `About` control
  reuses the same shell (h-9, 10px radius, 1px border, card shadow).
- Action bar (`App.tsx` footer, in normal flow below the table — nothing
  floats or overlaps), left to right: green `Extract` CTA (opens the
  confirm dialog), `Open new…`,
  destination chooser (grows full width to the pagination control: folder
  icon + centered path + chevron indicator, native directory picker,
  defaults to the archive's own folder) + inline `role="status"` result;
  right = `Pagination` + shell-styled `About` (opens the About dialog) +
  `LanguageSwitch` + `ThemeSwitch`. Confirm runs `extract_archive`
  (`7zz x -o<dest> [files...] -y`) with the checked rows, or everything
  when nothing is checked.
- `ExtractDialog`: centered modal (dim backdrop, 16px radius, 180ms pop,
  Esc cancel, reduced-motion safe) — big centered icon, the
  destination, `K of N selected` (or `All N`) file count, orange Cancel +
  blue Proceed (`Button` warning/accent variants, AA pairs in color-system).
  The backdrop never dismisses — buttons or Esc only.
- `ExtractDoneDialog`: same modal language for the result — green center
  icon with file count + destination on success, red icon with the error on
  failure, single OK action either way. The footer carries no status text.
  The backdrop never dismisses — OK or Esc only.
- `TestDialog`: integrity result popup (`7zz t` with `-bsp1` progress
  streamed over a Tauri `Channel`) — auto-starts on open, determinate
  progress bar while running, pass/fail result, OK enabled only when done.
  Same modal language; backdrop never dismisses.
- `ChecksumDialog`: MD5 / SHA-1 / SHA-256 / SHA-512 calculator — algorithm
  listbox, optional expected-hash input, live progress bar, Cancel (aborts
  the run, keeps the popup open), Close (cancels if running, then closes),
  computed digest with match/mismatch verdict. Esc mirrors Close except
  mid-calculation. Same modal language; backdrop never dismisses.
  Footer variants never change with phase (Calculate primary, Cancel/Close
  secondary).
- `AboutDialog`: same modal language — app name/version/release-date/
  commit/OS/arch grid, 7-Zip attribution paragraph with `7-zip.org` link,
  origin note, single OK. Backdrop never dismisses.
- `LanguageSwitch`: footer shell control (same shell as Pagination) with a
  floating listbox of native language names; switching persists to
  `localStorage` and re-renders instantly, no restart.
- `PasswordDialog`: password gate for encrypted archives — lock icon,
  password input with show/hide peek, live verify progress (`7zz t`);
  wrong passwords shake the input red and keep Check/Cancel, a match
  animates a success check and reveals the accept button. Opens for
  listing failures and for Test/Extract password errors (which it retries
  after verifying); the accept button reads Open / Extract / Test per
  caller. Cancel/Esc dismiss with the current listing untouched. Same
  modal language; backdrop never dismisses.
- `ArchiveTable` reports checkbox selection via `onSelectionChange`
  (cleared on each new listing); `App` feeds it to the dialog + extract.
- `ArchiveOverview`: the 50% overview card — centered empty state
  (icon tile + title + description + primary CTA + hint); once open, no
  card header and no pills (path lives in the centered window title;
  format/encryption/solid already have grid rows): the details start
  straight into the 4-column metadata grids (micro-label + 14px medium value, block centered
  on both axes via `m-auto`), progressbar with
  `aria-valuenow` for the compression ratio. Columns: Name flexes, Modified
  is fixed at `w-64`. Below the details (always, once an archive is open —
  even when the summary is unavailable) sits the integrity action row,
  right-aligned: equal-width (`w-32`) secondary `sm` `Test`
  (`test_archive`) and `Checksum` (`checksum_file`) buttons opening their
  dialogs.

## Layout

Single window (990×660 default, Tauri `tauri.conf.json`), no sidebar: slim
drag strip (`h-14`), then a 50/50 vertical split — `ArchiveOverview`
(`flex-[1_1_50%]`) above, table (`flex-[1_1_50%]`) below — then the action
bar, all on the 28px rhythm. Panels scroll internally, never the page. The
table scroller carries no bottom padding, so at max scroll the last row
lands exactly on the viewport bottom (no dead zone), with or without
pagination.
Window chrome differs per OS (Linux floating card vs macOS overlay
lights + flush layout): see `docs/window-chrome.md`.

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
