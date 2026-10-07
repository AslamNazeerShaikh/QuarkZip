# QuarkZip UI guidelines

Distilled from the Brightway reference analysis
(`CollegeAdmissionManagementSystem/docs/ReferenceUi/Reference-UI-Analysis.md`

- `UiPrompt.md`). That analysis is the visual source of truth; this file maps
  it onto QuarkZip. When uncertain: lighter border, softer shadow, more
  whitespace, smaller icon, less bold.

## Design direction

Native macOS utility (Tahoe-era glass window, material shells): clean,
calm, restrained, spacious. System neutrals, accent-driven interaction
(blue default, 8-accent system), translucent material shells everywhere,
medium-weight typography, rounded controls, single thin outline icon set
(Lucide, 16–20px, quiet gray). Full brief: `docs/macos-native.md`.

Explicit non-goals: CSS-imitated glass anywhere, glass on content/cards/
controls (rule 6 in color-system.md), Material/Bootstrap/admin-dashboard
look, gradients, neon, heavy shadows, 2px dark borders, vertical table
gridlines, bold-everything type, dark-mode-by-default (dark exists via
the theme switch but System is home). Native Liquid Glass is allowed for
the window background only — see `docs/macos-native.md` §8.

## Tokens

Palette, roles, accent system, and measured contrast live in
`docs/color-system.md`. Every component shell is translucent material
(`.qz-material-bar`: frame, cards, table, dialogs, buttons, inputs,
menus) — the pagination/theme/about shells are the reference look.
Solid fills survive only inside components: progress tracks, soft status
pills, readout boxes (their pairs are contrast-measured). Supporting
scales (all from the reference):

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
- Motion: 180ms ease-out for overlays/indicators (modal pop, switch
  slide, scrollbar fade). Theme switches apply instantly — no global
  color transition (a universal one caused a WebContent crash under a
  system appearance flip; see macos-native.md §9).

## Typography (Inter, OFL)

| Use                                       | Spec                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| Card title                                | 16px, 600                                               |
| Window title (centered drag strip)        | 13px, app name 600 + `                                  | ` + muted full path, ellipsis |
| Body / value                              | 14px (`text-sm`), 400–500                               |
| Secondary                                 | 13px, `--qz-muted`                                      |
| Micro-label (column headers, meta labels) | 11px, 600, uppercase, `tracking-[0.06em]`, `--qz-faint` |
| Tertiary / hint                           | 12px (`text-xs`), `--qz-faint`                          |

Numbers: comma thousands via `toLocaleString("en-US")`, sizes via
`formatSize` (IEC `KiB…`), stamps via `formatModified`/`formatDateTimeLocal`
(system time zone, AM/PM, `en-US` shape), `·` joins meta, never `|` or `/`.
Window title follows the open archive: `QuarkZip | "Path: <full path>"`
(plain `QuarkZip` otherwise; `setWindowTitle`, best-effort), centered in the
drag strip with ellipsis.

## Components (`src/components/ui/` + feature components)

shadcn-style API (`variant` + `size`), reference tokens underneath:

- `Button`: primary = solid accent CTA h-10, 9px radius, 14px/500
  (`--qz-on-primary` text both modes, per-accent AA pairs in color-system);
  secondary = surface + 1px border; ghost = text-only. Sizes default/`sm`/`bar` (36px footer height matching
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
  selection (accumulates across pages, resets per archive), native slim
  scrollbar (`.scroll-slim`), empty state centered on
  both axes. Sorting and paging are server-side (`get_page`: natural path
  order, null sizes first, folders-first type approximation — see
  backend-commands.md); the renderer holds one page only, so 10M listings
  never materialize in the webview. The listing never contains the archive itself: `parse_list_slt`
  skips the header block before the `----------` separator, so only real
  files/folders appear.
  reference empty state (16px icon + 14px gray text + 12px hint).
- `Pagination` / `ThemeSwitch`: solid surface, 10px radius, card shadow,
  8px inner radii. Segmented behavior (sliding indicator) preserved.
  The page-size menu hugs its trigger (`left-0`, `w-max min-w-full`, 8px
  gap) with option text insets matching the trigger (`px-2`), so list
  edges and text align with the control below. Edge-anchored menus open
  inward instead (`LanguageSwitch` uses `right-0` at the window's right
  edge) so floating lists never touch the sidewalls. The footer `About` and
  `LanguageSwitch` controls reuse the same shell as icon-only buttons
  (h-9 shell, 28px icon button, 8px inner radius — like collapsed
  `ThemeSwitch`); hover/title and aria-labels name them.
- Action bar (`App.tsx` footer, in normal flow below the table — nothing
  floats or overlaps), left to right: accent `Extract` CTA (opens the
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
- `LanguageSwitch`: icon-only footer shell control (same shell as
  Pagination) with a floating listbox of native language names; the button
  tooltip shows the active language. Switching persists to `localStorage`
  and re-renders instantly, no restart.
- `PasswordDialog`: password gate for encrypted archives — lock icon,
  password input with show/hide peek, live verify progress (`7zz t`);
  wrong passwords shake the input red and keep Check/Cancel, a match
  animates a success check and reveals the accept button. Opens for
  listing failures and for Test/Extract password errors (which it retries
  after verifying); the accept button reads Open / Extract / Test per
  caller. Cancel/Esc dismiss with the current listing untouched. Same
  modal language; backdrop never dismisses. Full behavior matrix:
  `docs/passwords.md`.
- `ArchiveTable` reports checkbox selection via `onSelectionChange`
  (cleared on each new listing); `App` feeds it to the dialog + extract.
- `ArchiveOverview`: three-state overview card — startup (no archive) shares
  the column equally with the table (both `flex-1`, centered empty state:
  icon tile + title + description + primary CTA + hint); once open, the
  card shrink-wraps a fixed 4×4 metadata grid (micro-label + 14px medium
  value, no card header, no pills: path lives in the centered window
  title) that is identical for every archive type — `—` fills N/A
  (7z-only Headers/Method/Solid/Blocks, entry-derived Host OS and
  Algorithms): no layout shift, no card scrollbar, ever. The ratio cell
  always reserves its progressbar track (empty fill when unmeasurable).
  A `More`/`Less` toggle (secondary `sm`, left of the action row, same
  shell as Test/Checksum) grows the card with the engine's full header
  metadata for advanced users while the table shrinks; collapsing hides
  the toggle, and re-expanding shows it without reshowing the extras.
  Below the details (always, once an archive is open —
  even when the summary is unavailable) sits the integrity action row,
  right-aligned: equal-width (`w-32`) secondary `sm` `Test`
  (`test_archive`) and `Checksum` (`checksum_file`) buttons opening their
  dialogs.
  The card collapses via the chevron toggle beside `Checksum` (same
  secondary `sm` shell, square icon-only, arrow rotates with the state):
  collapsed it shrink-wraps to the action row (`flex-none`) and the table
  absorbs the freed space; `Test`/`Checksum` stay available in both
  states. Pagination never changes with the card — page/row counts are
  independent of it.
  Opening an archive shows a progress popup (`LoadDialog`): `7zz l`
  reports no percent, so the bar is indeterminate and the rows show live
  counters instead (entries completed, data read, elapsed, throughput —
  no ETA, since totals are unknowable upfront). Cancel kills the sidecar
  (`cancel_list_archive`) and keeps the previous listing intact.

## Layout

Single window (800×675 default/minimum, Tauri `tauri.conf.json`), no sidebar: slim
drag strip (`h-14`), then the content column: startup shares it equally
(`ArchiveOverview` and table both `flex-1`); once open, the card
shrink-wraps its fixed grid and the table (`flex-1`) absorbs all
leftover space (growing the card via More shrinks the table) — then the
action bar, all on the 28px rhythm. Only the table, menus, dropdowns,
and the More panel (pathological key counts only) scroll; the card
itself never does. The
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
