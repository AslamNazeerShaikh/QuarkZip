# Design system

Status: implemented in `Sources/QuarkZip/Design/` and the browser views.

> Legacy audit: the two earlier design documents were compared against this
> system, the implementation, and the current HIG in
> [legacy-rules-review.md](legacy-rules-review.md). The contrast, accent,
> appearance, sidebar-color, and badge-text decisions are pending. Do not
> start the next visual pass until those are chosen.

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
| Minimum window | 1120 x 640 |
| Default window | 1360 x 820 |
| Sidebar | 230 min and ideal, 310 max |
| Header | 68 |
| Filter bar | 44 |
| Table row | 24 compact, 30 comfortable |
| Inspector | 310 ideal, 280 to 380 |
| Status bar | 26 |

Spacing is a 4 pt grid. Content padding is 16. Dense groups use 8.

## Color

One accent for interactive controls, chosen in Settings. Category and method
colors are semantic and do not change with the accent. Text is always
`.primary`, `.secondary`, or `.tertiary`.

### Accent choices

Blue (default), Indigo, Purple, Pink, Red, Orange, Green, Teal, Graphite.
The accent applies to selection, focus, primary buttons, links, and the
selected filter chip.

### Category palette

| Category | Symbol | Color |
| --- | --- | --- |
| Folder | `folder.fill` | systemBlue |
| Document | `doc.text.fill` | systemIndigo |
| Image | `photo.fill` | systemPink |
| Video | `film.fill` | systemRed |
| Audio | `waveform` | systemOrange |
| Archive | `archivebox.fill` | systemTeal |
| Code | `chevron.left.forwardslash.chevron.right` | systemGreen |
| Other | `doc.fill` | systemGray |

Category color appears as a 6 pt dot, a 10 pt icon, a soft 14 percent fill,
or a 30 percent border. Never as body text color.

### Method palette

`LZMA2` purple, `Deflate` blue, `BZip2` orange, `PPMd` indigo, `ZSTD` teal,
`Store` and `Copy` gray. Badges use a soft fill with the method color as
text, checked in both appearances.

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
| `selection` | 14 percent accent |
| `dataTrack` | Ratio and composition track |

No fixed grays. No `Color(red:)` or hex in views. `Scripts/token-lint.sh`
enforces that.

## Type

| Style | Size / weight | Use |
| --- | --- | --- |
| Display | 26 bold rounded | Welcome title |
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

Numeric columns always use monospaced digits. Nothing below 10 pt.

## Components

One file per family, every state built: rest, hover, pressed, focused,
selected, disabled, loading, error where applicable.

- `QZCard` - raised group with a 0.5 pt border.
- `QZIconTile` - tinted rounded square for a category or method.
- `QZBadge` - format, method, encryption, filter summary.
- `QZStatCard` - icon, monospaced value, uppercase label, optional detail.
- `QZFilterChip` - category dot, label, count, selected state, hover.
- `QZSectionLabel` - uppercase group label with optional trailing count.
- `QZRatioBar` - 2 to 9 pt track, colored fill, no animation on scroll.
- `QZCompositionBar` - stacked category bar, 1 pt gaps, clipped capsule.
- `QZInspectorField` - 76 pt label, value, optional color dot, selectable.
- `QZSidebarRow` - 26 pt row, tinted icon, label, count capsule, selected
  tint, hover.
- `QZMethodStyle` and `QZFormatStyle` - one place for method and format
  color.

Header and filter controls are system `Button`, `Menu`, `Picker`, and
`TextField`. No shape with a tap gesture.

## Screens

### Welcome dashboard

- Section label, display title, one sentence.
- Four KPI cards: Recent, Formats, Engine, Privacy.
- Drop card with dashed border and a gradient icon disc, plus a supported
  format strip with colored badges.
- Recent archives card with colored format badges and paths.
- Three capability cards: browse, filter, copy paths.
- Footer: green engine dot, offline note, license.

### Browser

- Archive header: icon tile, name, format badge, encrypted count, parent
  path, four KPI cards (Files, Size, Packed, Ratio).
- Breadcrumb only when inside a folder. The root is an archive icon.
- Filter bar: search, All and category chips with counts, Encrypted and
  Large chips, sort menu, density menu.
- Table: Name, Type, Size, Packed, Ratio with mini bar, Modified date only,
  Method badge, lock icon. No CRC in the table; it lives in the inspector.
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

General: theme, accent swatches, row density. About: version, engine,
license, credits.

## Motion

| Token | Duration | Use |
| --- | --- | --- |
| Instant | 100 ms | Hover, press |
| Quick | 160 ms | Chip, row, drop border |
| Standard | 220 ms spring | Inspector, sheets |
| Gentle | 320 ms spring | Reveal, resize |

Only transform, opacity, and progress. Stagger at most 8 rows. Reduce Motion
swaps springs for a 120 ms fade. No looping animation except indeterminate
progress.

## Accessibility

- Every icon-only control has a label and help text.
- Category always has a word in the Type column; color is redundant.
- Ratio always has a number; color is redundant.
- Contrast checked in light, dark, and Increase Contrast.
- Table rows expose name, type, size, date, and method as one element.
- Focus ring visible on keyboard focus, hidden on mouse click.
- The full flow works with the keyboard alone.

## Snapshot review

`Scripts/snapshot.sh` renders welcome, browser, and details in light and
dark at 1360 x 820. Every UI change is reviewed on all six images. The
window is inactive in offscreen renders, so the selection fill looks gray;
check selection color in the running app.
