---
name: macos-design
description: Native macOS design rules for QuarkZip (Sequoia-era, pre-glass) — semantic palette, 8-accent system, standard materials, no liquid glass
version: 1.0.0
---

# macOS design (QuarkZip)

Full brief: `docs/macos-native.md`. Palette + measured contrast:
`docs/color-system.md`. Component rules: `docs/ui-guidelines.md`.

## Non-negotiables

- **No liquid glass, no glassmorphism, anywhere.** Standard materials
  only: `.qz-material-bar` on chrome (title strip, footer shells, menus,
  table header), solid `--qz-surface` content cards and dialogs.
- **Tokens only.** Components reference `--qz-*` roles, never raw hex.
  After any token change: `python3 scripts/contrast-check.py` must pass
  (AA 4.5 every text pair) and the color-system table re-recorded.
- **Accent drives interaction.** CTA, selection tint, focus ring, toggles
  follow `--qz-accent`/`--qz-primary*`. Status keeps fixed hues
  (green/blue/amber/red). Never body text in accent.
- **Dark/light discipline.** `.dark` × `data-accent` matrix in
  `src/index.css`; System default follows `prefers-color-scheme`.
  Dark on-accent is black (white-on-brights fails AA — Apple ships it
  anyway; we don't).

## Reviews

For full HIG audits use the installed `apple-design` skill
(`.agents/skills/apple-design`, `SKILL.md` protocol: load the always-set

- 3–6 screen pages, cite `file.md › Heading`, report What/Why/Fix with
  numbers). Load `emilkowalski/apple-design` + `justinwetch/apple-hig`
  from the `ui-skills` MCP for web motion/materials measurements.
  `prefers-reduced-transparency` must keep a solid-surface answer everywhere
  `.qz-material-bar` is used.
