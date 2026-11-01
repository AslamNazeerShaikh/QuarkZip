# App icon

Status: Icon Composer source, standalone SVG, 1024 render, and review sheet
are in `Icon/`. The app bundle compiles and ships the icon.

## Concept

A pale glass tile holding an open archive tray. Three jewel-toned file cards
fan out of it: violet, coral-red, and gold. A gold four-point sparkle sits at
the top right. The tray is blue on the left and violet on the right, with a
white handle slot.

This follows the supplied reference, `Glossy Archive Box with Sparkle.png`:
same composition, proportions, card fan, box taper, sparkle position, and
color families. The detail is redrawn as native vector layers so the macOS
icon system can apply its mask, shadow, and specular pass.

No text, no letters, no SF Symbols, no 7-Zip mark, no UI screenshot.

## Grid

| Measure | Value |
| --- | --- |
| Canvas | 1024 x 1024 |
| macOS tile | 824 x 824, centered at 100 px margin |
| Tile corner radius | 185 |
| Tray top | x 212 to 812, y 502 |
| Tray base | x 238 to 786, y 752 |
| Handle | 164 x 46, centered at y 620 |
| Purple card | 292 x 310, rotated 8 degrees |
| Red card | 402 x 290, rotated 7 degrees |
| Yellow card | 336 x 250, rotated 4 degrees |
| Sparkle center | 722, 224 |
| Sparkle span | 192 px wide, 184 px tall |

The glyph stays inside the macOS safe area. The tray, cards, and sparkle
occupy about 60 percent of the canvas width.

## Layers

```text
Icon/AppIcon.icon/
  icon.json
  Assets/boxBack.svg     purple inner rim
  Assets/cards.svg       violet, coral, gold cards and their gloss
  Assets/box.svg         blue-violet tray, lip, side shading
  Assets/handle.svg      white handle slot
  Assets/sparkleGlow.svg gold halo
  Assets/sparkle.svg     gold four-point star
```

Layer order is first on top, verified with `ictool`. The group uses a neutral
shadow and `specular: true`; translucency is off so the jewel colors stay
saturated. Every colored layer is `glass: false`; the system still supplies
the rounded mask, icon shadow, and appearance variants.

The background is a two-stop `linear-gradient` with orientation:

| Stop | Color |
| --- | --- |
| Cyan-white | `srgb:0.882,0.973,1.000` |
| Pink-white | `srgb:0.961,0.871,1.000` |

## Palette

| Role | Color |
| --- | --- |
| Tile | cyan-white to pink-white |
| Tray | `#25C8FF` to `#8A2BE8` |
| Tray lip | `#8AF4FF` to `#7A6BFF` |
| Back rim | `#A678FF` to `#4C1D95` |
| Violet card | `#AC7CFF` to `#5B21E8` |
| Coral card | `#FF7186` to `#FF7A3D` |
| Gold card | `#FFE86A` to `#FF9F0A` |
| Sparkle | `#FFF8B8` to `#FFB300` |
| Handle | white with a cool inner shadow |

## Files

- `Icon/AppIcon.icon/` - source, committed.
- `Icon/AppIcon.svg` - standalone 1024 vector preview with tile, shadows,
  gloss, and glow.
- `Icon/AppIcon-1024.png` - rendered default look.
- `Icon/AppIcon-review.png` - contact sheet: default, dark, tinted dark, clear
  light at 256 pt, then default at 32 and 16 pt.
- `Resources/Assets.car` and `Resources/AppIcon.icns` - generated, ignored by
  git, rebuilt by `tools/make_icon.sh`.

## Checks

```bash
tools/make_icon.sh
tools/icon_review.sh
./build.sh
plutil -p ~/Applications/QuarkZip.app/Contents/Info.plist | grep -i icon
```

The 16 pt render still reads as a tray with three colored cards and a gold
sparkle. The bundle carries `Assets.car` and `AppIcon.icns`, and
`CFBundleIconName` is `AppIcon`.

## Rules

- Do not draw the rounded square, margin, shadow, or sheen in the layers.
- Do not add text, letters, or an SF Symbol.
- Keep the glyph between 45 and 55 percent of the canvas.
- Filled shapes only. A stroke on an open path leaves a faint glass line.
- Re-run both tools after every layer or palette change.
