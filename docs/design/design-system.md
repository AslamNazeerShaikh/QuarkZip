# Design system

Status: tokens are being implemented in `Sources/QuarkZip/Design/`. This page
is the contract for the implementation.

## Direction

Native macOS, dense data, calm chrome. The archive surface is the hero. The
chrome recedes. Color encodes state. Motion explains change.

Not: a Windows dialog stretched to Mac size, a glass panel everywhere, a dark
"pro app" costume, or a web dashboard.

## Color

Semantic first. All colors resolve through `QZTheme` and adapt to appearance
and increased contrast.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | system window | system window | Window |
| `surface` | `NSColor.textBackgroundColor` | same | Lists, tables |
| `surfaceRaised` | system control background | same | Cards, inspector |
| `chrome` | `.regularMaterial` | `.regularMaterial` | Toolbar, floating bar |
| `separator` | `separatorColor` | same | Dividers |
| `textPrimary` | `labelColor` | same | Content |
| `textSecondary` | `secondaryLabelColor` | same | Metadata |
| `textTertiary` | `tertiaryLabelColor` | same | Hints |
| `accent` | user accent | user accent | Selection, primary action |
| `success` | `systemGreen` | same | Finished |
| `warning` | `systemOrange` | same | Collision, slow |
| `danger` | `systemRed` | same | Failure, destructive |

Accents offered in Settings: Quark Blue (default), Graphite, Iris, Teal,
Green, Amber, Rose, Coral. Each has a tuned `onAccent` so text on a filled
button stays above 4.5:1.

Never use a fixed gray for text. Never use accent for large fills except the
selection in a focused list and the primary button.

## Type

| Style | Size / weight | Use |
| --- | --- | --- |
| `title` | 22 / semibold | Sheet title, empty state |
| `heading` | 15 / semibold | Section header |
| `body` | 13 / regular | Rows, labels |
| `callout` | 12 / regular | Secondary metadata |
| `caption` | 11 / regular | Column headers, hints |
| `mono` | 12 / regular, monospaced digits | Sizes, CRC, paths |

SF Pro through system text styles where possible. Metrics always use
monospaced digits so values do not jitter during progress.

## Spacing and layout

- 4 pt grid: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Window: minimum 900 x 560. Sidebar 220. Inspector 280. List flexible.
- Toolbar 52. Status bar 28. Row 28 (compact 24, comfortable 32).
- Content padding 16. Section gap 24.
- Radii: 6 control, 10 card, 14 panel, 20 floating chrome.
- Elevation: 0 content, 1 sticky header, 2 floating bar, 3 sheet.

## Motion

| Token | Duration | Curve | Use |
| --- | --- | --- | --- |
| `instant` | 100 ms | easeOut | Hover, press |
| `quick` | 160 ms | easeOut | Row insert, tag |
| `standard` | 220 ms | spring(0.28, 0.86) | Sheet, panel |
| `slow` | 320 ms | spring(0.42, 0.90) | Window resize, reveal |

Rules:

- Only animate transform, opacity, and progress.
- Stagger at most 8 rows, 24 ms apart.
- No looping animation except an indeterminate progress bar.
- Reduce Motion: replace springs with a 120 ms fade, disable stagger and
  scale, keep progress.
- No animation longer than 320 ms in response to a click.

## Glass

Liquid Glass belongs to floating chrome over content:

- Toolbar background when content scrolls under it.
- Floating selection bar ("3 selected - Extract - Delete").
- Drop target HUD.
- Job pill in the corner.

Never glass: the entry table, the inspector body, sheets, Settings forms.
Those are solid for readability.

## Components

Build each with every state: rest, hover, pressed, focused, selected,
disabled, loading, error.

- `QZToolbar` - back/forward, breadcrumb, search, view switch, actions.
- `QZSidebar` - sections, rows with icon and count, drop highlight.
- `QZEntryRow` - icon, name, size, packed, ratio, modified, CRC, method.
- `QZColumnHeader` - label, sort indicator, resize handle, menu.
- `QZBreadcrumb` - path segments, overflow menu, archive chips.
- `QZDropZone` - empty state and drag target, one breathing pulse.
- `QZEmptyState` - icon, title, one sentence, one primary action.
- `QZProgressBar` - determinate, indeterminate, throughput, ETA, cancel.
- `QZJobRow` - kind, archive name, progress, state, cancel.
- `QZTag` - format, encrypted, solid, method.
- `QZInspectorSection` - grouped facts, selectable values.
- `QZSearchField` - scoped search, clear, result count.
- `QZPasswordSheet` - archive name, header-encrypted note, remember toggle.
- `QZExtractSheet` - destination, selection summary, collisions, options.
- `QZCompressSheet` - format, preset, advanced disclosure, estimate.

## Screens

1. **Welcome** - drop zone, recent archives, "Open Archive..." and "New
   Archive...". No marketing copy.
2. **Browser** - sidebar, toolbar with breadcrumb, table, inspector, status
   bar.
3. **Extract sheet** - plan first, then progress in the job pill.
4. **Compress sheet** - source summary, format segmented control, preset,
   advanced expansion, estimate, Create.
5. **Jobs** - popover from the toolbar, list of running and finished jobs,
   log per job.
6. **Settings** - General, Appearance, Extraction, Compression, Advanced.
   One grouped form per tab, sized to content.
7. **About** - version, engine version, credits, license, source link.

## Keyboard

| Shortcut | Action |
| --- | --- |
| Cmd-O | Open archive |
| Cmd-N | New archive |
| Cmd-Shift-E | Extract selection |
| Cmd-Shift-C | Compress selection in Finder |
| Cmd-F | Search in archive |
| Cmd-Up | Parent folder |
| Cmd-[ / Cmd-] | Back / forward |
| Return | Open folder or archive |
| Space | Quick Look |
| Cmd-A | Select all |
| Cmd-Shift-T | Test archive |
| Cmd-K | Command palette |
| Escape | Cancel sheet or clear search |

Every menu command also appears in the menu bar with the same title as the
button and the same shortcut shown in help.

## Accessibility

- Every icon-only control: `accessibilityLabel`, `accessibilityHelp`.
- Table rows expose name, size, date, and kind as one element.
- Progress announces at 25%, 50%, 75%, 100%, not every tick.
- Focus ring visible on keyboard focus, hidden on mouse click.
- Reduce Motion and Reduce Transparency honored everywhere.
- Contrast checked at 4.5:1 for body text in both appearances.
- VoiceOver rotor: headings, tables, form controls.

## Copy

- Buttons: verb plus object. "Extract 3 Items", "Create Archive".
- Errors: what failed, where, what to do. "The archive is password
  protected. Enter the password to continue."
- Empty: teach one next action. "Drop an archive here, or press Cmd-O."
- Never "Oops", "Error", or a raw code alone.
