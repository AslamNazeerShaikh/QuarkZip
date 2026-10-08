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
  The titlebar shares the gutters (`px-7` both platforms; mac keeps the
  76px traffic-light inset on the left, empty state stays symmetric), so
  `Open` lands on the card's edge line and the button's top air equals
  its gap down to the card.
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
| Window title (drag strip)                 | 13px, app name 600 + `                                  | ` + muted path, middle-ellipsis (dirs truncate, file name survives) |
| Body / value                              | 14px (`text-sm`), 400–500                               |
| Secondary                                 | 13px, `--qz-muted`                                      |
| Micro-label (column headers, meta labels) | 11px, 600, uppercase, `tracking-[0.06em]`, `--qz-faint` |
| Tertiary / hint                           | 12px (`text-xs`), `--qz-faint`                          |

Numbers: comma thousands via `toLocaleString("en-US")`, sizes via
`formatSize` (IEC `KiB…`), stamps via `formatModified`/`formatDateTimeLocal`
(system time zone, AM/PM, `en-US` shape), `·` joins meta, never `|` or `/`.
Window title follows the open archive: `QuarkZip | "Path: <full path>"`
(plain `QuarkZip` otherwise; `setWindowTitle`, best-effort). Both bars
share a `minmax` 1fr-auto-1fr grid so the title claims every free pixel
(centered when short, filling when long, reflowing live on resize); long
paths truncate the directory middle only — app name, prefix and file name
never shrink (full path on hover). `Open new…` (yellow `highlight` solid,
opaque on glass) renders only with an archive open: mac overlay right,
Linux custom bar left; the empty state's card CTA owns opening.

## Components (`src/components/ui/` + feature components)

shadcn-style API (`variant` + `size`), reference tokens underneath:

- `Button`: shell-chrome API (`variant` + `size`) over reference tokens —
  every variant shares the Pagination/ThemeSwitch look (translucent
  material, 10px radius, 1px border, card shadow, centered content):
  `primary`/`accent`/`success`/`highlight`/`warning` are accent/blue/
  green/yellow/orange translucent tints (`.qz-tint-*`, body-text labels —
  a hue fails AA on its own tint — hue carried by icons at usage sites),
  `secondary` the neutral shell, `ghost` text-only. Sizes default
  (h-10, modal actions)/`sm` (h-8, small dialog utilities)/`bar` (h-9 —
  the universal chrome height: footer actions, card-row buttons, titlebar
  actions, all matching the Pagination/ThemeSwitch shells)/icon.
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
- `Pagination` / `ThemeSwitch`: material shells, 10px radius, card shadow,
  8px inner radii. Segmented behavior (sliding indicator) preserved.
  The page-size menu hugs its trigger (`left-0`, `w-max min-w-full`, 8px
  gap) with option text insets matching the trigger (`px-2`), so list
  edges and text align with the control below. The readout and the
  jump field are one combined control (`[<input>] / <total>`, `spinbutton`,
  same h-7 inner shell, input sized to the page count): only clean
  in-range numbers jump silently on Enter; anything else (`66abc`,
  out-of-range, non-numeric, empty) opens
  an Invalid-page confirm (warning icon, valid range shown, Jump lands on
  the read-off page / Cancel reverts to the open page). Escape/blur
  reverts; single pages show a static `1 / 1` (empty: `0 / 0`). The entry
  total always shows, narrow windows included. The
  page-size listbox portals to `document.body`, viewport-anchored above
  its shell — card `overflow-hidden` would otherwise clip it on the short
  collapsed card. While the card is collapsed the menus drop _below_
  their shells instead (`below`, over the table, which has the room).
  While the theme segment is out,
  pagination shrinks to one icon button (naming the current page,
  re-expanding on click) and returns to full width when it minimizes —
  the card row never overflows at 800px. `LanguageSwitch` portals the
  same way (its menu is taller than the collapsed card) and likewise
  drops below its shell while collapsed, so floating lists never clip
  or touch the sidewalls. The footer `About` and
  `LanguageSwitch` controls reuse the same shell as icon-only buttons
  (h-9 shell, 28px icon button, 8px inner radius — like collapsed
  `ThemeSwitch`); hover/title and aria-labels name them.
- Action bar (`App.tsx` footer, in normal flow below the table — nothing
  floats or overlaps): `Extract Selected` (primary CTA with `ListChecks`
  icon; disabled with no dest/while extracting/on empty archives — with
  nothing checked it opens the Nothing-selected confirm instead),
  `Extract All` (green `success` solid with `Download` icon — a deliberate
  user-driven deviation from the one-hue rule — same disabled rules),
  then the destination chooser (grows full width to the window
  edge: folder icon + centered path + chevron indicator, native directory
  picker, defaults to the archive's own folder, truncates live on resize).
  `Open new…` lives in the titlebar, not here: macOS overlay strip right,
  Linux custom bar left (title stays centered via the 1fr-auto-1fr grid on
  both; the button opts out of the native drag with `stopDrag`, disabled
  while a listing is in flight).
- `ExtractDialog`: centered modal (dim backdrop, 16px radius, 180ms pop,
  Esc cancel, reduced-motion safe) in three modes — `selected`
  (`ListChecks` tile, `K of N selected files`), `all` (`Download` tile,
  `All N files`), `empty` (warning tile, `No files are selected — extract
all N instead?` with an `Extract All` confirm). Big centered icon, the
  (live final) destination, orange Cancel + blue Proceed/Extract All
  (`Button` warning/accent variants, AA pairs in color-system).
  Every mode carries the subfolder section (centered like the rest of
  the card): an unchecked `Extract into a new subfolder` checkbox
  revealing a centered name field prefilled with the archive basename
  (`photo.zip` → `photo`, `data.tar.gz` → `data`), editable, validated
  for APFS (UTF-8 only incl. lone-surrogate rejection, ≤255 bytes, no
  `/ :` or controls, not `.`/`..`) with inline errors plus a debounced
  backend uniqueness probe (`path_exists` on `dest/<name>` — Proceed
  stays disabled while checking, taken, or invalid). A live
  `N / 255 bytes (UTF-8)` budget and an `Append date-time` button
  (`name_2026-10-08_14-30-05`, head-trimmed char-safe past the cap)
  sit under the field; the live final path above is the preview. Confirm
  runs `extract_archive` (`7zz x -o<dest> [files...] -y`)
  (a page-by-page select-everything collapses to the empty list too, so
  10M paths never cross IPC).
  The backdrop never dismisses — buttons or Esc only. Any dialog rendered
  inside a material (`backdrop-filter`) ancestor must portal to
  `document.body`, or `fixed inset-0` centers on the ancestor instead of
  the window (this bit the page-jump confirm once).
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
  is textual only ("73.9% of original", `—` when unmeasurable) — no bar.
  A `More`/`Less` toggle (secondary `bar`, left of the action row, same
  shell as Test/Checksum) grows the card with the engine's full header
  metadata for advanced users while the table shrinks; it renders only
  when extras exist (no dead button — the cluster shifts left without it),
  collapsing hides the toggle, and re-expanding shows it without reshowing
  the extras.
  Below the details (always, once an archive is open —
  even when the summary is unavailable) sits one centered integrity
  action row: `More`/`Less`, then the controls cluster (`Pagination`,
  icon-only `Test`, icon-only `Checksum`, `ThemeSwitch`, `LanguageSwitch`,
  `About` last), then the collapse chevron. `More` renders only when
  extras exist and unmounts collapsed (never a dead button or spacer);
  the row is `justify-center`, wrapping to packed centered lines. Collapsing unmounts the
  More cell (no empty spacer), so the cluster shifts to the extreme left;
  expanding puts it back. With no archive the card
  shows the centered empty state with the Theme/Language/About utilities
  in an extreme-left row of their own.
  The card collapses via the chevron toggle beside `Checksum` (same
  secondary `sm` shell, square icon-only, arrow rotates with the state):
  collapsed it shrink-wraps to the action row (`flex-none`) and the table
  absorbs the freed space; `Test`/`Checksum` stay available in both
  states. The collapsed state is owned by `App` and persisted in
  localStorage (`quarkzip.collapsed`), so it survives restarts — and it
  drives the card-row menu direction (down while collapsed, up otherwise).
  Pagination never changes with the card — page/row counts are
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

## Element IDs (DOM debugging)

Every structural `div` and every interactive element (buttons, inputs,
menus, options) carries a stable `id="qz-<scope>-<element>"` so Inspect
Element maps straight back to the source: searching the id finds the one
call site. Rules: ids are kebab-case, never translated text, and unique
within the mounted DOM. Repeated items suffix a stable key — table rows
and their cells use the 1-based serial (`qz-table-row-42-path`), page-size
/ theme / language / checksum options use their value
(`qz-pager-size-opt-all`), extras/about rows use their index. Shared
primitives (`Button`, `Card`, `Meta`, `TableCheckbox`, `Stat`) never hardcode
an id — they accept an optional `id` prop and callers pass unique values.
Pre-existing ids (`archive-password`, `extract-folder-name`, …) and all
`data-testid` hooks are kept as-is.

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
