"""Gate for the macOS-native QuarkZip palette (see docs/color-system.md).

Checks every text pair (body, muted, status pills, CTA fills incl. hover)
at AA 4.5. Micro-label faint pairs are reported, not gated (restricted use).
Usage: python3 scripts/contrast-check.py (exit nonzero on any AA fail).
"""
import sys


def lum(h: str) -> float:
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))

    def lin(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a: str, b: str) -> float:
    x, y = lum(a), lum(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


# (bg, text) text pairs per theme. CTA rows cover every accent fill + hover.
LIGHT = [
    ("body", "#000000", "#ececec"),
    ("muted", "#3c3c43", "#ececec"),
    ("success", "#1f7a33", "#e5f2e7"),
    ("info", "#0b5bd3", "#e8f0fe"),
    ("warning", "#8a4d00", "#fff1dd"),
    ("danger", "#c92a22", "#fdeceb"),
    ("blue", "#ffffff", "#0070eb"),
    ("blue-hover", "#ffffff", "#005fc7"),
    ("purple", "#ffffff", "#5e5ce6"),
    ("purple-hover", "#ffffff", "#3f3de1"),
    ("pink", "#ffffff", "#ea002d"),
    ("pink-hover", "#ffffff", "#c60026"),
    ("red", "#ffffff", "#ed0d00"),
    ("red-hover", "#ffffff", "#c90b00"),
    ("orange", "#ffffff", "#b36200"),
    ("orange-hover", "#ffffff", "#8f4e00"),
    ("yellow", "#000000", "#9c7a00"),
    ("yellow-hover", "#000000", "#a88700"),
    ("green", "#ffffff", "#23863b"),
    ("green-hover", "#ffffff", "#1c6a2f"),
    ("graphite", "#ffffff", "#6e6e73"),
    ("graphite-hover", "#ffffff", "#5d5d61"),
]
DARK = [
    ("body", "#ffffff", "#1e1e1e"),
    ("muted", "#ebebf5", "#1e1e1e"),
    ("success", "#4cc38a", "#14291f"),
    ("info", "#82aaff", "#16233d"),
    ("warning", "#e8a33d", "#33270f"),
    ("danger", "#ff6961", "#3a1f1e"),
    ("blue", "#000000", "#0a84ff"),
    ("blue-hover", "#000000", "#0072e5"),
    ("purple", "#000000", "#7d7aff"),
    ("purple-hover", "#000000", "#7676ff"),
    ("pink", "#000000", "#ff375f"),
    ("pink-hover", "#000000", "#ff1342"),
    ("red", "#000000", "#ff453a"),
    ("red-hover", "#000000", "#ff2316"),
    ("orange", "#000000", "#ff9f0a"),
    ("orange-hover", "#000000", "#e58b00"),
    ("yellow", "#000000", "#ffd60a"),
    ("yellow-hover", "#000000", "#e5bf00"),
    ("green", "#000000", "#30d158"),
    ("green-hover", "#000000", "#28b54b"),
    ("graphite", "#000000", "#98989f"),
    ("graphite-hover", "#000000", "#86868e"),
]

failures = []
for mode, pairs in (("light", LIGHT), ("dark", DARK)):
    for label, fg, bg in pairs:
        r = ratio(fg, bg)
        ok = r >= 4.5
        print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1  {mode} {label} ({fg} on {bg})")
        if not ok:
            failures.append(f"{mode} {label}")

print("--- faint (micro-labels only, documented, not gated) ---")
for mode, faint, bg in (("light", "#6e6e73", "#ececec"), ("dark", "#98989f", "#1e1e1e")):
    print(f"INFO  {ratio(faint, bg):5.2f}:1  {mode} faint on bg")

sys.exit(1 if failures else 0)
