---
name: quarkzip-design
description: QuarkZip's visual language, tokens, motion, glass, and component states. Use before building or reviewing any QuarkZip window, toolbar, sidebar, row, sheet, empty state, or animation.
---

# QuarkZip design

Native first, distinctive second. The app should look like Apple built an
archive manager, then gave it a sharper point of view: dense data, calm
chrome, and motion that makes large operations feel physical.

## Non-negotiables

- System window chrome, toolbar, menus, sheets, and Settings. No fake title
  bars, no custom traffic lights.
- Liquid Glass only on floating chrome over content: toolbar, floating
  action bar, HUD. Content surfaces are solid and readable.
- 4 pt grid. 8 pt is the default gap, 16 pt inside groups, 24 pt between
  sections.
- One accent chosen by the user in Settings, default Quark Blue. Semantic
  colors come from the system. No fixed grays, no `Color(red:...)` in views.
- Type: SF Pro for UI, SF Mono for sizes, CRCs, and paths. Numeric columns use
  monospaced digits. Never below 11 pt.
- Light and dark are equal citizens. Test both before shipping.

## Tokens

`Sources/QuarkZip/Design/Tokens.swift` is the only source of colors, radii,
spacing, and motion. Views read `QZTheme`.

- Space: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Radius: 6 (controls), 10 (cards), 14 (panels), 20 (floating chrome).
- Motion: instant 100 ms, quick 160 ms, standard 220 ms, slow 320 ms.
  Springs: snappy (response 0.28, damping 0.86), gentle (0.42, 0.9).
- Elevation: content 0, sticky header 1, floating bar 2, sheet 3.

## Motion rules

- Animate position, size, opacity, and progress. Do not animate blur or
  shadow on large surfaces.
- Rows insert with a 12 pt rise and fade, stagger capped at 8 rows.
- The drop target breathes once on enter, never loops.
- Progress is continuous; the number is monospaced so it does not jitter.
- `accessibilityReduceMotion` swaps springs for a 120 ms fade and disables
  stagger.

## Components

Build these once, in `Sources/QuarkZip/Design/Components/`, with every state:

`QZToolbar`, `QZSidebarRow`, `QZEntryRow`, `QZColumnHeader`, `QZBreadcrumb`,
`QZDropZone`, `QZEmptyState`, `QZProgressBar`, `QZJobRow`, `QZTag`,
`QZInspectorSection`, `QZSearchField`, `QZSegmentedControl`, `QZSheetHeader`.

Each has rest, hover, pressed, focused, selected, disabled, loading, and
error where the state applies. A component without states is a mockup.

## Copy

Short, concrete, verb-first. "Extract 3 items", not "Proceed". "Can't open
this archive", not "Error 0x80004005". Empty states teach the next action.
Password prompts say which archive and whether the header is encrypted.

## Checks

- `Scripts/snapshot.sh` produces every page and Settings tab in light and
  dark.
- `Scripts/grid-lint.sh` flags off-grid spacing in views.
- Contrast: text at least 4.5:1, large text 3:1, in both appearances.
- VoiceOver: every control has a label; icon-only buttons also have help.

Done when the snapshots were opened and the grid, contrast, and reduce-motion
paths all pass.
