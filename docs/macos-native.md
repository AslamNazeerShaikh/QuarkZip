# QuarkZip native macOS direction

Target: a Sequoia-era macOS utility — Finder-like calm, system accent,
translucent chrome, full dark/light discipline. **Not** Liquid Glass
(Tahoe): no refractive blur, no floating glass pills, no specular edges.
Standard materials only. This doc is the researched basis; `color-system.md`
holds the measured palette, `ui-guidelines.md` the component rules.

## 1. Sources, verdicts, cross-checks

| Source                                                                              | Verdict                                                                                | What we took                                                                         |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `dickwu/apple-design-skill` (998★, 123 HIG pages + Tauri section, refresh script)   | **Installed** (`.agents/skills/apple-design`, pinned in `skills-lock.json`)            | Review protocol, lens order, citation format; HIG ground truth below                 |
| `emilkowalski/apple-design` (ui-skills registry; WWDC fluid-interfaces → web)       | **Referenced via ui-skills MCP** (no install needed)                                   | Spring values, backdrop recipe, tracking scale, reduced-motion/transparency handling |
| `justinwetch/apple-hig` (measurements-first HIG reference)                          | **Referenced via ui-skills MCP**                                                       | Cross-checks for control sizes, type minima                                          |
| `fayazara/macos-app-skills` (SwiftUI/AppKit: build, glass settings, Sparkle, notch) | **Not installed** — wrong stack (no web/Tauri content; settings skill is liquid-glass) | `macos-patterns` concepts folded into §5 manually                                    |
| `mcpmarket.com/tools/skills/macos-native-ui-design`                                 | **Ignored** — directory listing, zero substance                                        | —                                                                                    |
| `agenticskills.io` skills + MCP indexes (193 skills, 196 servers)                   | **No new MCP needed** (see §7)                                                         | Figma/shadcn pointers considered and declined with reasons                           |

Apple HIG pages read in full and cited below: `designing-for-macos.md`,
`color.md` (Dec 2025), `materials.md` (Sep 2025), `dark-mode.md`
(2024), plus `cross-platform.md` (Tauri mapping). Apple revises HIG
several times a year — re-pull via the installed skill's
`scripts/pull-hig.mjs` when guidance feels stale.

## 2. HIG groundings (with citations)

- **Semantic colors, never hard-coded hues** (`color.md › System colors`):
  label / secondary / tertiary label hierarchy, separator vs opaque
  separator, `controlAccentColor`, `windowBackgroundColor`,
  `keyboardFocusIndicatorColor`. Our `--qz-*` tokens ARE this layer.
- **One color, one meaning; accent for interaction** (`color.md › Best
practices`, `› App accent colors`): prominent buttons take the accent
  fill; status keeps system hues. Hence CTA follows `--qz-accent`,
  success/info/warning/danger stay fixed green/blue/amber/red.
- **No app appearance switch; respect System** (`dark-mode.md › Best
practices`): our System default stays; Light/Dark manual options remain
  as an override (documented deviation, kept for Linux/Windows parity).
- **Standard materials for structure, vibrancy for legibility**
  (`materials.md › Standard materials`, Desktop): translucent chrome over
  content, thicker = more opaque; vibrant (high-contrast) text on
  materials; never light-on-light stacks. Hence `.qz-material-bar`
  (blur 20 + saturate 180%, after the emilkowalski recipe) on chrome
  only, solid content cards.
- **Desktop tinting** (`dark-mode.md › Desktop (macOS)`): neutral
  component backgrounds carry transparency so windows harmonize with the
  wallpaper. Hence translucent (not opaque) bar fills.
- **Reduced transparency gets a solid answer** (emilkowalski §14,
  skill Lens 1): `.qz-material-bar` falls back to `--qz-surface`,
  blur off, under `prefers-reduced-transparency`.
- **Tracking is size-specific; Inter stays** (emilkowalski §15):
  tighten large text (`-0.02em` display), body near `0`. Inter remains
  the face (cross-platform consistency beats SF purism; system stack
  already in the fallback chain).
- **Desktop minima** (skill Lens 1): type ≥10pt desktop (we use 11px
  micro / 13px body ✓), controls ≥20px (ours 32–40px ✓).
- **Keyboard focus always visible on desktop** (Lens 2): accent-tinted
  `focus-visible` ring on every control (already the pattern — now
  accent-driven automatically).
- **Tauri mapping** (`cross-platform.md`): semantic colors → CSS custom
  properties; vibrancy → `backdrop-filter`; "prefer real materials and
  window chrome over a web imitation" — our title strip + footer shells
  - menus + table header are the material surfaces.

## 3. What changed in this pass (and what deliberately didn't)

Changed: full palette → macOS neutrals + 8-accent system (blue default);
CTA green → accent fill; focus/selection/toggles follow accent;
translucent chrome on title strip, footer shells, menus, table header;
solid content cards and dialogs; reduced-transparency fallback added.
Unchanged: radius ladder, shadows, spacing rhythm, Inter, layout, density,
component APIs — the app you like, in native dress.
Explicitly rejected: liquid glass / glassmorphism anywhere (rule 6 in
color-system.md); dark-mode-by-default; app-specific appearance as the
default (System is).

## 4. Motion (springs where touchable, restraint everywhere else)

Per the emilkowalski skill: critically damped default (`damping 1.0`,
response 0.3–0.4s), bounce only for momentum-driven gestures; our
180ms ease-out stays for chrome fades/pops (non-gesture). Feedback on
press, never input lockout mid-transition, reduced-motion swaps to
cross-fades (already in `index.css`). No spring library added — no
gesture-driven surfaces exist yet; revisit with drag-to-extract.

## 5. Native patterns checklist (Tauri desktop)

From `cross-platform.md` + `macos-patterns` concepts, audited for us:
native menu bar with every command (gap: Tauri menu not yet wired —
tracked follow-up), standard shortcuts (Esc dismisses, Enter confirms —
already the pattern), resizable window + persisted geometry (partially:
maximize handling exists), right-click context menus (gap: table has
none — tracked follow-up), hover/pointer feedback everywhere (present),
settings under app menu (gap: no settings UI yet — accent switcher +
this belong there), no critical info in bottom bars (footer holds
actions + pagination state, acceptable for a utility).

## 6. Skill + review protocol

Design reviews follow the installed `apple-design` skill: load the
always-set (`accessibility`, `layout`, `typography`, `color`,
`designing-for-macos`, `cross-platform.md`) + 3–6 screen-specific pages,
audit Accessibility → Conventions → Craft → Interaction → Writing, cite
`file.md › Heading`, report What/Why/Fix with numbers. Our project
addenda (in `.opencode/skills/macos-design.md`): no-liquid-glass rule,
token table, accent/contrast gate (`scripts/contrast-check.py` must pass
after any token change).

## 7. MCP verdict: no new servers

Surveyed agenticskills 196-server index (Design & Creative: Figma,
Blender, 21st-dev, Inspo…). None earns a place: Figma needs an API key
plus Figma files we don't have; 21st-dev generates components we don't
need; Inspo is reference browsing. The configured `ui-skills` MCP
already serves all three Apple skills on demand with zero install.
Decision: keep `ui-skills` + `github` + `whiteboard`; revisit only if a
Figma-based design handoff begins.
