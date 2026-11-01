# Design system

Status: implemented in `Sources/QuarkZip/Design/` and the browser views.

> Legacy audit: the two earlier design documents were compared against this
> system, the implementation, and the current HIG in
> [legacy-rules-review.md](legacy-rules-review.md). The recommended decisions
> were accepted and implemented on 2026-11-01.

## Direction

A CRM-grade archive workspace in Mac clothes.

Dense, scannable, and color coded like a professional data tool, but built
from system controls, system type, semantic color, and native window
behavior. The archive is the record. The header is its profile. The table is
its line items. The inspector is its detail rail.

Not: a Windows dialog, a marketing dashboard, a glass panel on every surface,
or a rainbow of decoration.

## Layout

Three panes, all resizable through native split behavior.

```text
┌────────────┬───────────────────────────────────────────┬──────────────┐
│ Sidebar    │ Archive header          KPI KPI KPI KPI   │ Inspector    │
│ 230        ├───────────────────────────────────────────┤ 310          │
│            │ Search | filter chips | sort | density    │              │
│ Filters    ├───────────────────────────────────────────┤ Overview or  │
│ Categories │ Name  Type  Size  Packed  Ratio  Date ... │ entry detail │
│ Recents    │ dense virtualized table                    │              │
│ Locations  │                                            │              │
├────────────┴───────────────────────────────────────────┴──────────────┤
│ Status bar: view totals, selection count, engine version              │
└───────────────────────────────────────────────────────────────────────┘
```

| Area | Size |
| --- | --- |
| Minimum window | 1200 x 720 |
| Default window | 1360 x 800 |
| Sidebar | 220 min, 264 ideal, 320 max |
| Header | 68 |
| Filter bar | 44 |
| List row | 28 compact, 32 comfortable |
| Maximum window | 1680 x 1050, clamped to the screen |
| Inspector | 220 min, 264 ideal, 320 max |
| Status bar | 28 |
| Chip | 24 |
| Emoji box | 20 |

Spacing is a 4 pt grid. Window and page margin is 20. Card padding is 16.
Dense groups use 8. Group gaps are 12, section gaps 16 to 24. Raw numbers
in views are only 0, 1, 2, or a multiple of 4. Sizes always use binary
IEC units, where 1 KiB = 1,024 bytes.

Both sidebars share the same width range and default. The left sidebar
uses the system sidebar material; the right inspector column uses `.bar`
glass over clear content, so both read as glass and both fill the full
vertical height. Toggling the inspector animates the divider with the
gentle spring; the center list keeps its fixed columns and only the
flexible Name column resizes, so rows never flash.

## Color

The app follows the system accent by default, with a runtime Theme
override in Settings (System, Light, Dark) that applies immediately to
this app only. Category and method colors are semantic and do not change
with the accent.

### Text hierarchy

| Token | Definition | Measured target |
| --- | --- | --- |
| `primary` | `labelColor` | 21.00 light, 16.67 dark |
| `textSecondary` | primary at 70 percent | 8.52 light, 8.73 dark |
| `textFaint` | primary at 56 percent | 4.94 light, 6.07 dark |

Functional text never uses raw `secondaryLabelColor` or
`tertiaryLabelColor`. System secondary is 3.95:1 in light and system tertiary
is 1.88:1, below the 4.5:1 floor for text under 18 pt. The raw roles remain
for decorative icons, separators, and dashes only.

### Category palette

| Category | Outline (rows) | Filled (tiles) | Color |
| --- | --- | --- | --- |
| Folder | `folder` | `folder.fill` | systemBlue |
| Document | `doc.text` | `doc.text.fill` | systemIndigo |
| Image | `photo` | `photo.fill` | systemPink |
| Video | `film` | `film.fill` | systemRed |
| Audio | `waveform` | `waveform.circle.fill` | systemOrange |
| Archive | `archivebox` | `archivebox.fill` | systemTeal |
| Code | `chevron.left.forwardslash.chevron.right` | same | systemGreen |
| Other | `doc` | `doc.fill` | systemGray |

Category color appears as a 5 to 6 pt dot, an outline icon in a dense row,
a filled icon in a tile, a soft 14 percent fill, or a 30 percent border.
Never as text color. Primary text on the same tint measures 12.7:1 to
18.7:1, so the badge recipe keeps the color and passes contrast.

### Method palette

`LZMA2` purple, `Deflate` blue, `BZip2` orange, `PPMd` indigo, `ZSTD` teal,
`Store` and `Copy` gray. A method badge is primary text plus a colored dot,
on a 14 percent method tint with a 30 percent border. Colored text inside the
badge is forbidden: it measures 1.92:1 to 4.20:1 in light.

### Ratio palette

Green below 45 percent, orange below 80 percent, red at 80 percent and
above. The number is always present, so color is never the only signal.

### Status

Encrypted and warnings use systemOrange with a lock icon. Failures use
systemRed with a triangle. Success uses systemGreen with a check or a word.
No status color without an icon or a label.

### Surfaces

| Token | Use |
| --- | --- |
| `background` | Window behind content |
| `content` | Table, search field, drop area |
| `card` | Header cards, inspector cards, dashboard cards |
| `inspector` | Right rail background |
| `headerBackground` | Archive header, status bar |
| `filterBackground` | Filter strip |
| `separator` | 1 pt dividers |
| `hover` | 4.5 percent primary |
| `selection` | 13 percent accent, with a 28 percent accent border |
| `dataTrack` | Ratio and composition track |

No fixed grays. No `Color(red:)` or hex in views. `Scripts/token-lint.sh`
enforces that.

## Type

| Style | Size / weight | Use |
| --- | --- | --- |
| Display | 26 bold | Welcome title |
| Title | 22 semibold | Empty states |
| Headline | 15 semibold | Archive name, entry name |
| Body | 13 regular | Rows, labels |
| Body strong | 13 medium | Inspector values |
| Callout | 12 regular | Secondary text, dates |
| Caption | 11 regular | Metadata |
| Micro | 10 regular | Dense metadata, status |
| Section | 10.5 semibold, tracked | Uppercase section labels |
| Badge | 10.5 medium | Chips, type labels |
| Metric | 12 monospaced | Sizes, dates, methods |
| Micro mono | 10 monospaced | CRC, IDs |
| Metric large | 18 semibold monospaced | KPI values |
| Stat value | 15 semibold monospaced | Header and dashboard KPI values |
| Mini value | 14 semibold monospaced | Inspector mini stats |
| Row icon | 12 medium | Dense row SF Symbols |
| Row glyph | 11 medium | Small row SF Symbols |
| Emoji | 13 | Emoji glyphs in a 20 point box |

Numeric columns always use monospaced digits. Nothing below 10 pt.
Emoji is never the only signal: every emoji sits next to an icon or a
word, lives in a fixed 20 point box with 4 to 8 point spacing, and can be
turned off in Settings without moving rows.

## Components

One file per family, every state built: rest, hover, pressed, focused,
selected, disabled, loading, error where applicable.

- `QZCard` - raised group with a 0.5 pt border.
- `QZIconTile` - tinted rounded square for a category or method.
- `QZBadge` - primary text, colored dot or colored icon, soft tint, border.
- `QZStatCard` - colored icon, monospaced primary value, faint uppercase label.
- `QZFilterChip` - colored dot, primary or strong-secondary label, faint count,
  selected tint and accent border.
- `QZSectionLabel` - uppercase group label with optional trailing count.
- `QZRatioBar` - 2 to 9 pt track, colored fill, no animation on scroll.
- `QZCompositionBar` - stacked category bar, 1 pt gaps, clipped capsule.
- `QZInspectorField` - 80 pt label, value, optional color dot, selectable.
- `QZSidebarRow` - 28 pt row, accent icon plus optional fixed emoji,
  optional category/format dot, label, faint count capsule, soft accent
  selection tint with accent border, hover. Icons and dots are hidden
  from VoiceOver.
- `QZEmoji` - 13 pt glyph in a fixed 20 point box, decorative by default.
- `QZMethodStyle` and `QZFormatStyle` - one place for method and format
  color.
- `QZAboutView` - app icon, name, version, engine, license, credits,
  copy-version and done actions, shown from the menu, the toolbar, the
  sidebar, and Settings.

Header and filter controls are system `Button`, `Menu`, `Picker`, and
`TextField`. No shape with a tap gesture.

## Screens

### Welcome dashboard

- Section label, display title, one sentence.
- Four KPI cards: Recent, Formats, Engine, Privacy.
- Drop card with dashed border and a gradient icon disc, plus a supported
  format strip with colored badges.
- Recent archives card with primary-text format badges, colored dots, and
  faint paths.
- Three capability cards: browse, filter, copy paths.
- Footer: green engine dot, offline note, license.

### Browser

- Archive header: icon tile, name, format badge, encrypted count, parent
  path, four KPI cards (Files, Size, Packed, Ratio).
- Breadcrumb only when inside a folder. The root is an archive icon.
- Filter bar: search, All and category chips with counts, Encrypted and
  Large chips, sort menu, density menu.
- List, not Table: Name (flexible), Type 92, Size 76, Packed 76, Ratio
  72 with mini bar, Modified 96 date only, Method 88 badge, lock 20.
  No CRC in the list; it lives in the inspector. Fixed row heights keep
  columns aligned; selection is a soft accent fill with an accent border,
  so primary text and method pills stay readable in light and dark.
- Empty states name the active filter and offer the reset path.
- Status bar shows the current view, not the whole archive.

### Inspector

- One entry: identity, path card, 2x2 mini stats, compression bar, details,
  copy path and copy name.
- Multiple entries: count, total size, encrypted count, folder count, a
  preview list, copy paths.
- No selection: archive identity, archive path, six mini stats, composition
  bar with every category, largest entries, method distribution.

### Settings

General: Theme (System, Light, Dark, applied at once), emoji toggle, row
density, file-type color note with the IEC size note. About: version,
engine, license, credits, plus a pointer to QuarkZip > About QuarkZip.
The About card itself lives in the app menu, the toolbar, and the
sidebar App section.

### Sidebar

Calm navigation. Icons follow the system accent, with an optional fixed
emoji per row in a 20 point box. Category rows carry a small fixed color
dot. Fixed icon color is reserved for Encrypted (warning). Large Items is
a filter, not a danger state, so it uses the accent. The sidebar and the
inspector share the 220 to 320 range with a 264 default, resize natively,
and both render over glass for the full height.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| Instant | 100 ms easeOut | Hover, press |
| Quick | 160 ms easeOut | Chip, row, drop border |
| Standard | spring response 0.32, damping 0.94 | Inspector, sheets |
| Gentle | spring response 0.42, damping 1.0 | Reveal, resize |
| Reduced | 120 ms fade | Any animation under Reduce Motion |

Only transform, opacity, and progress. Stagger at most 8 rows. Every
`withAnimation` and `.animation` goes through `QZMotion.animation(_:reduceMotion:)`.
No looping animation except indeterminate progress.

## Accessibility

- Functional text meets 4.5:1 below 18 pt and 3:1 for 18 pt or bold.
- Primary text on a 14 percent tint is the badge recipe. Colored text inside
  a colored badge is forbidden.
- Category always has a word in the Type column; color is redundant.
- Ratio always has a number; color is redundant.
- Decorative icons and dots are hidden from VoiceOver.
- Table rows expose name, type, size, date, and method as one element.
- Focus ring visible on keyboard focus, hidden on mouse click.
- The full flow works with the keyboard alone.
- Contrast is measured in light, dark, and Increase Contrast before a color
  token changes. `Scripts/contrast-check.sh` is part of `verify` and checks
  every functional text pair and every category/method tint.

## Snapshot review

The window uses `WindowSizing` to set `contentMinSize` and `contentMaxSize`,
so the sidebar, table, and inspector cannot be resized into a broken layout.
`Scripts/snapshot.sh` renders welcome, browser, details, and Settings in
light and dark. Every UI change is reviewed on all eight images. The
window is inactive in offscreen renders, so the selection fill looks gray;
check selection color in the running app.

## Decisions

The 2026-11-01 review accepted the recommended options from
[legacy-rules-review.md](legacy-rules-review.md): neutral badge text with a
color dot, system accent and appearance, a calm sidebar with category dots,
SF Pro default, and damped motion with a full Reduce Motion path. The
remaining P1 and P2 items are sortable table headings, sidebar size support,
and optional zebra rows.
