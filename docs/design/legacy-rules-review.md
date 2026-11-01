# Legacy design rules review

Status: analysis only. No UI changes were made from this document.

Sources reviewed:

- [`macos-native.md`](https://github.com/AslamNazeerShaikh/QuarkZip/blob/main/docs/macos-native.md)
- [`color-system.md`](https://github.com/AslamNazeerShaikh/QuarkZip/blob/main/docs/color-system.md)
- Current [`design-system.md`](design-system.md), `QZTheme.swift`, the browser,
  inspector, sidebar, welcome, Settings, and the six snapshots.
- Apple Human Interface Guidelines: Color (2025-12-16), Typography
  (2025-12-16), Materials (2025-09-09), Sidebars (2026-06-08), Toolbars
  (2025-12-16), Lists and tables (2023-06-21), App icons (2026-10-28),
  SF Symbols (2025-07-28), Dark Mode (2024-08-06), Accessibility
  (2025-06-09), Layout (2026-09-09).
- Measured WCAG contrast for the current system-color palette in light and
  dark, resolved through `NSAppearance` and composited over
  `controlBackgroundColor`.

The legacy documents were written for a Tauri webview with a CSS token
system. Their principles transfer. Their implementation does not. The
current app is native SwiftUI, so system APIs and HIG replace the CSS layer.

## Executive verdict

`macos-native.md` is strongest where it talks about behavior: semantic
color, system appearance, native menus, context menus, keyboard focus,
desktop minima, reduced transparency, no glass on content. It is weakest
where it describes the Tauri glass recipe, the browser material recipe, and
Inter. Those should not be carried over.

`color-system.md` is strongest where it demands measured contrast, one hue
for one meaning, a separate role for faint text, a restriction on danger
red, and a documented exception list. It is weakest when it treats a custom
eight-accent fill table as the palette. Native SwiftUI should start from
semantic system colors, then measure.

The current dense workspace is the right direction. It is not yet
accessible enough: several text pairs are between 1.88:1 and 4.20:1, below
the HIG's 4.5:1 floor for text under 18 pt. The fix is not to abandon color.
It is to move color from badge text to dots, borders, and fills while keeping
the text in primary or strong secondary.

## What matches and should be adopted

| Legacy rule | Where it still applies | Current state | Action |
| --- | --- | --- | --- |
| Semantic color roles, never raw hex in components | HIG Color: use system colors, never hard-code values | `QZTheme.Palette` already uses `NSColor` semantic roles | Keep, and add a lint that bans color literals outside `Design/` |
| One hue, one meaning | HIG Color: same color must not mean different things | Accent blue and Folder blue coexist; Large Items uses danger red; ratio red is data | Audit and separate interaction, category, and status uses |
| Accent for interaction, status for state | HIG Color: accent for controls, status colors for status | Mostly true, but colored badge text borrows status hues for labels | Keep accent for controls; stop using status hues as badge text |
| No glass on content, cards, controls | HIG Materials: Liquid Glass only for controls and navigation | Cards, table, inspector are solid; `bar` and `regularMaterial` are used for chrome and overlays | Keep |
| Respect system appearance | HIG Dark Mode: avoid an app-specific appearance setting | Settings offers System, Light, Dark, and `preferredColorScheme` forces the choice | Remove the override or make it an advanced exception |
| Contrast is measured, not eyeballed | HIG Accessibility: 4.5:1 below 18 pt | No contrast gate exists; measured failures below | Add a contrast script and gate every token change |
| Faint color only for micro labels | Legacy rule 5; HIG semantic hierarchy | `tertiary` is used for section labels, dates, counts, engine text | Replace with a measured `textFaint` that passes 4.5:1 |
| Danger is never a solid red button | Legacy rule 4; HIG color meaning | No solid red action buttons | Keep |
| Desktop minimum 10 pt text, 20 pt controls | HIG Typography and Accessibility | Smallest text 10 pt, chips 22 pt, buttons 22 pt | Keep; add a regression check |
| Keyboard focus always visible | HIG Accessibility, legacy lens 2 | Plain-style custom chips/buttons may suppress the ring | Test Full Keyboard Access and fix focus rings |
| Every command exists in the menu bar | HIG Toolbars | Open, Go Up, Inspector, Copy, Reveal exist; density, sort, filter reset do not | Add View menu commands |
| Context menus on content | HIG menus, legacy checklist | Table rows have them; sidebar rows do not | Add sidebar context menus |
| Critical actions not at the bottom | HIG Layout, HIG Sidebars | Status bar is informational only | Keep |
| Reduced transparency and reduced motion | HIG Accessibility, legacy lens 1 | Reduce Motion is handled only in the drop zone | Add a shared motion gate |
| Batching and bounded memory | Legacy 10M listing lesson | Engine enumeration is batched, list is virtualized | Keep as a hard rule |

## What does not transfer

| Legacy instruction | Why it does not apply | Replacement |
| --- | --- | --- |
| Tauri `window-vibrancy` and CSS backdrop filters | The app is native; SwiftUI/AppKit get system glass automatically | Use system window, sidebar, toolbar, and material APIs |
| Inter as the UI face | HIG says SF Pro is the macOS system font | SF Pro, SF Mono for metrics, SF Pro Rounded only as a deliberate display voice |
| Manual tracking scale for every size | SF Pro has dynamic optical tracking | Let the system handle tracking; track only uppercase micro labels |
| CSS custom properties and hex tokens | SwiftUI uses semantic `NSColor`/`Color` roles | Keep semantic roles; use asset colors only when a custom token is unavoidable |
| Eight-accent fill table as the product palette | HIG lets the system accent win unless multicolor | Follow system accent, or add a System option and measure any override |
| `data-accent` and `.dark` class switching | Appearance is system-owned | `preferredColorScheme(nil)` and `Color.accentColor` |
| White text on every bright accent | Measured 2.16:1 to 3.65:1 for several system accents | Use neutral or measured on-colors, or avoid large accent fills |
| 180 ms CSS transitions | SwiftUI uses springs and transactions | Damped springs, fades under Reduce Motion |
| WebContent crash notes | WebKit-specific | Keep the performance lesson, not the diagnosis |

## Measured contrast

Method: resolve `NSColor` under `.aqua` and `.darkAqua`, composite alpha
over `controlBackgroundColor` (white and `#1e1e1e`), apply the WCAG 2.1
relative luminance formula. Values vary slightly by macOS version. Re-measure
after every token change.

### Text hierarchy

| Pair | Light | Dark | 4.5:1 |
| --- | --- | --- | --- |
| label on card | 21.00 | 16.67 | Pass |
| secondary label on card | **3.95** | 5.89 | Light fails |
| tertiary label on card | **1.88** | **2.26** | Both fail |
| label opacity needed for 4.5:1 | 0.54 | 0.46 | - |
| label opacity needed for 7:1 | 0.66 | 0.62 | - |

The current UI uses secondary for dates, sizes, paths, and many values, and
tertiary for uppercase section labels, counts, and the engine line. In light
mode those are below the HIG floor.

### Colored text on its own 14 percent tint

This is exactly what `QZBadge`, filter chips, and the method badges do today.

| Family | Light range | Dark range |
| --- | --- | --- |
| Category text | 1.92 to 4.20 | 3.96 to 6.83 |
| Method text | 1.92 to 4.20 | 3.96 to 6.83 |
| Primary label text on the same tint | 17.24 to 18.74 | 12.70 to 14.44 |

Every colored-text badge fails at least one appearance. Primary text on the
same tint passes everywhere. This is the single most important finding.

### White on a solid system accent

| Accent | Light | Dark |
| --- | --- | --- |
| Blue | 3.52 | 3.23 |
| Indigo | 5.09 | 3.51 |
| Purple | 4.17 | 3.63 |
| Pink | 3.65 | 3.52 |
| Red | 3.57 | 3.43 |
| Orange | 2.31 | 2.23 |
| Green | 2.22 | 2.02 |
| Teal | 2.16 | 1.86 |
| Graphite | 3.26 | 2.87 |

Only indigo in light passes. The welcome CTA uses white on the accent fill.
A `.bordered` button, or a measured custom fill, is the accessible answer.

Black on solid system colors passes all but indigo in light (4.13:1).
Per-color on-colors are possible, but a neutral text plus colored dot is
simpler and more consistent.

### Current failures to fix first

1. Colored text inside badges and chips.
2. Tertiary section labels, counts, and engine text.
3. Secondary table metadata in light mode.
4. White-on-accent welcome CTA.
5. Any accent fill in dark mode with white text.

## Typography

HIG macOS sizes and the current tokens:

| HIG style | HIG size / weight | Current token | Current size / weight | Verdict |
| --- | --- | --- | --- | --- |
| Large Title | 26 regular, bold emphasized | `display` | 26 bold rounded | Size matches; rounded is a brand choice |
| Title 1 | 22 regular, bold emphasized | `title` | 22 semibold | Close; semibold is acceptable emphasis |
| Title 3 | 15 regular, semibold emphasized | `headline` | 15 semibold | Correct size, wrong HIG name |
| Headline | 13 bold | none | - | Missing as a token; `bodyStrong` is 13 medium |
| Body | 13 regular | `body` | 13 regular | Correct |
| Callout | 12 regular | `callout` | 12 regular | Correct |
| Subheadline | 11 regular, semibold emphasized | `caption` | 11 regular | Correct |
| Footnote / Caption | 10 regular / medium | `micro` | 10 regular | At the HIG minimum |
| Custom | - | `section` | 10.5 semibold tracked | Acceptable for dense labels; needs contrast |
| Custom | - | `badge` | 10.5 medium | Acceptable; colored text is the problem, not size |
| Custom | - | `metric` | 12 monospaced | Correct for tabular data |
| Custom | - | `metricLarge` | 18 semibold monospaced | Correct for KPI values |

What matters:

- The app respects the macOS default (13 pt) and minimum (10 pt). That part
  of the old document and the HIG agree.
- `headline` at 15 pt is actually HIG Title 3. Rename the token or add a real
  headline token, so future agents do not treat "headline" as 13 pt bold.
- `display` is the only rounded face. SF Pro Rounded is an Apple face and is
  allowed, but a dense CRM workspace reads more professional with default SF
  Pro. Recommendation: use default SF Pro for display, or keep rounded only
  for the welcome page as a brand moment.
- Metrics use SF Mono, which is appropriate. Do not replace them with SF Pro.
- Manual tracking is only justified for the uppercase `section` labels.
  The old document's size-by-size tracking table is a web workaround and
  should not be copied.
- Do not import Inter. It would break system optical sizing, vibrancy, and
  the native feel.

Decision: keep SF Pro and SF Mono, rename tokens toward HIG roles, and choose
whether the welcome display stays rounded.

## Iconography

HIG rules that matter here:

- SF Symbols are the default. Outline variants work well in lists and
  toolbars; fill variants are for emphasis and selection.
- Symbol weight should match adjacent text. At 10 pt the current table icons
  use semibold, which is heavier than the 13 pt regular name.
- Sidebar icons should normally follow the app/system accent. Fixed colors
  are for rare meaning, such as a VIP or a warning. The current sidebar uses
  a different fixed color for nearly every row.
- App icons use layered Icon Composer files, 1024 square, with default,
  dark, clear, and tinted variants. Do not use SF Symbols, text, or a replica
  of another product's identity in the app icon.

Current issues:

| Issue | Evidence | Recommendation |
| --- | --- | --- |
| Filled category icons in 10 pt table rows | `nameCell` uses `category.symbolName` at 10 pt semibold | Add outline symbol names for table rows; keep fill for selected rows and tiles |
| Audio icon is outline while other categories are filled | `waveform` vs `folder.fill`, `photo.fill` | Use a consistent set: outline in rows, fill in tiles |
| Sidebar is a rainbow of fixed colors | Folder blue, document purple, archive teal, recent formats, warning orange, danger red | Accent icons by default; use a small category dot for meaning; keep fixed color only for Encrypted and Large |
| Sidebar ignores the system sidebar size | Fixed 12 pt text, 11 pt glyph, 26 pt row | Use standard sidebar text/glyph sizing or observe the sidebar size setting |
| Decorative icons are read by VoiceOver | `QZSidebarRow` and `nameCell` do not hide the image | Add `.accessibilityHidden(true)` and combine the row label |
| App has no icon | No `Icon/AppIcon.icon` or asset catalog | Build a layered Icon Composer icon: archive stack or layered container, deep blue/teal, no text, no 7-Zip mark |
| Lock icon is 9 pt | `lock.fill` in the table | Use 10 to 11 pt, medium weight |

Icon set recommendation:

- Table rows: outline symbols, 11 to 12 pt, medium weight.
- Sidebar: neutral or accent symbols, 12 to 13 pt, matching the sidebar size.
- Inspector and KPI tiles: filled symbols on a soft tint, 13 to 16 pt.
- Toolbar: monochrome SF Symbols, no custom borders.
- App icon: custom vector layers in Icon Composer, not SF Symbols.

## Color and color meaning

### Rules worth keeping

- Semantic roles, not hex values.
- Accent for interaction, status for state.
- One hue, one meaning.
- Measured contrast, not eyeballed.
- Faint color only for micro labels, and only above 4.5:1.
- Danger is not a solid red button.
- No glass in content.
- Increase Contrast and Reduce Transparency have answers.

### Rules that need a translation

| Legacy rule | Native translation |
| --- | --- |
| `--qz-muted` for secondary text | A `textSecondary` token at 7:1, not raw system secondary at 3.95:1 |
| `--qz-faint` only for 11 to 12 px uppercase | A `textFaint` token at 4.5:1, used for section labels and IDs |
| Eight accent fills | System accent, or a System option plus measured overrides |
| White on bright accent | Avoid large accent fills; use borders, dots, and selection tints |
| Dark ramp hand-built | System dynamic colors, measured per appearance |
| One hue one meaning | Audit accent vs folder blue, Large Items red, and status vs ratio colors |

### Concrete color issues in the current UI

1. **Folder blue and accent blue.** Finder uses blue folders, so this is
   defensible. The distinction works because one is an icon inside content and
   the other is selection chrome. Document it as an intentional exception, or
   shift the default accent to indigo.
2. **Large Items uses danger red.** Size is not an error. Use teal, indigo,
   or a neutral/accent treatment. Reserve red for failures and destructive
   actions.
3. **Ratio uses green, orange, red.** This is data visualization, not an
   action status. Keep the numeric value and bar, and document the exception
   to "status colors only."
4. **Colored badge text.** Replace with primary text plus a colored dot,
   icon, or 2 pt leading bar on the soft tint. This preserves the color
   system and passes 4.5:1.
5. **Tertiary section labels.** Use `textFaint` at 4.5:1 or `textSecondary`
   at 7:1. Do not use `tertiaryLabelColor` for text.
6. **Sidebar rainbow.** Let navigation be calm. Put category colors in the
   table, filter chips, composition bar, and inspector, not in every sidebar
   icon.
7. **Accent picker.** The current `.tint` overrides the system accent. Add a
   System option (recommended default) or remove the picker. If kept, measure
   every accent's on-color and avoid large fills.
8. **Appearance picker.** HIG says avoid an app-specific appearance setting.
   Follow the system. Keep the snapshot override for testing only.

### Proposed badge recipe

```text
background: category or method color at 14 percent over the card
leading:    6 pt dot, or 10 pt icon in the same color
text:       primary label at the badge size
border:     0.5 pt of the color at 30 percent, optional
selected:   accent-tinted background, primary text, accent border, accent dot
```

This keeps the dense color coding, passes contrast, and follows HIG's
"color plus another signal" rule.

## Motion and accessibility

The old document recommends critically damped motion, short chrome fades,
and reduced-motion cross-fades. The current tokens are slightly bouncier:

| Token | Current | Recommendation |
| --- | --- | --- |
| Instant | 100 ms easeOut | Keep |
| Quick | 160 ms easeOut | Keep |
| Standard | spring 0.28 / 0.86 | spring 0.32 / 0.94, or `.smooth` |
| Gentle | spring 0.42 / 0.90 | spring 0.42 / 1.0 |
| Drop target | one pulse, then settle | Keep; it is the one place where a small bounce is meaningful |

Only the drop zone checks Reduce Motion. Root error banners, chip/drop
transitions, and any future job progress need a shared gate. Use a helper:

```swift
func qzAnimation(_ animation: Animation,
                 reduceMotion: Bool) -> Animation? {
    reduceMotion ? .easeOut(duration: 0.12) : animation
}
```

Accessibility gaps:

- Hide decorative SF Symbols in sidebar rows and table name cells.
- Use `.accessibilityElement(children: .combine)` on custom rows.
- Custom `.buttonStyle(.plain)` chips and rows need a visible keyboard focus
  ring. Test with Full Keyboard Access.
- Add Increase Contrast variants for soft tints and borders, or fall back to
  primary text and opaque borders when `colorSchemeContrast == .increased`.
- Keep the 4.5:1 gate for text under 18 pt. Use 3:1 for 18 pt and bold text.
- Test the accent picker with every choice and both appearances if it stays.

## Table and density

The dense 24/30 pt rows with 13 pt body text are within the HIG's desktop
minimum and are the right density for a CRM workspace. Two HIG gaps remain:

1. **Sortable column headings.** HIG says clicking a heading should sort,
   and clicking again should reverse. The current table sorts only from the
   filter bar menu.
2. **Column resizing and persistence.** Verify that SwiftUI Table resizing
   works at the minimum width; persist widths per archive kind.
3. **Alternating rows.** HIG suggests alternating colors for wide tables.
   The current table uses separators only. The earlier native alternating
   style painted stripes into empty space, which looked wrong. Keep
   separators for now, or build a small AppKit table bridge for zebra,
   resizing, and sorting control.

## Decision sheet

Recommended options are first.

| ID | Decision | Options |
| --- | --- | --- |
| D1 | Badge text | A. Primary text plus color dot/bar (recommended). B. Measured custom colored text. C. Solid fills with per-color on-color |
| D2 | Accent | A. Follow system accent, no picker (recommended). B. Keep picker with System default. C. Keep current fixed picker |
| D3 | Appearance | A. System only (recommended). B. System plus advanced override. C. Keep current picker |
| D4 | Sidebar icons | A. Accent/neutral icons plus category dots (recommended). B. Keep full-color sidebar |
| D5 | Display type | A. SF Pro default for display (recommended). B. Keep SF Pro Rounded |
| D6 | Large Items color | A. Teal/indigo, not danger (recommended). B. Keep red |
| D7 | Table rows | A. Separators now, AppKit zebra later (recommended). B. Native alternating rows now. C. Build the AppKit table bridge in M1 |
| D8 | Motion | A. Damped springs plus full Reduce Motion (recommended). B. Keep current |
| D9 | Contrast policy | A. 4.5:1 for small text, 7:1 target for secondary (recommended). B. Apple system label roles as-is |
| D10 | App icon | A. Layered Icon Composer icon now (recommended). B. Defer to M4 |

## Recommended borrow list

Take from the legacy docs:

- The contrast gate and the habit of recording measured pairs.
- The rule that faint color is only for micro labels.
- The separation of interaction accent, category color, and status color.
- "Danger is not a solid red button."
- "No glass in content."
- Respect for system appearance.
- Desktop minima and visible keyboard focus.
- Native menus, context menus, and no critical actions at the bottom.
- Reduced transparency and reduced motion fallbacks.
- Batching and bounded memory for huge archives.

Take with translation:

- The eight-accent table becomes a System accent or a measured override.
- The hand-built dark ramp becomes system dynamic colors with measured
  variants.
- The web tracking scale becomes native SF optical sizing.
- The 180 ms CSS transitions become damped SwiftUI springs.

Do not take:

- Tauri window vibrancy, CSS glass recipes, or WebKit-specific fixes.
- Inter, bundled fonts, or a web token layer.
- Raw hex values mapped onto SwiftUI.
- White text on bright accents as a default.
- An app-specific appearance picker as the primary experience.

## Suggested order after the decisions

1. **P0 accessibility:** fix badge/chip text contrast, text hierarchy,
   white-on-accent CTA, and the accent/appearance overrides.
2. **P0 native alignment:** calm the sidebar, fix Large Items semantics,
   hide decorative icons from VoiceOver, add focus rings.
3. **P1 structure:** outline icons in rows, sidebar size support, sortable
   table headings, column persistence, menu commands.
4. **P1 motion:** one damped motion set with Reduce Motion and Increase
   Contrast paths.
5. **P2 identity:** layered Icon Composer app icon, optional zebra rows,
   final typography pass.

The current visual direction survives. The next pass is about making the
same dense, colorful workspace honest in light mode, honest with accessibility
settings, and closer to the Mac's native hierarchy.
