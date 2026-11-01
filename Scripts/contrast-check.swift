import AppKit

// WCAG 2.1 contrast gate for the functional text pairs in QuarkZip.
//
// The alpha values must stay in sync with QZTheme.Palette:
//   textSecondary = primary at 0.70
//   textFaint     = primary at 0.56
// Category and method badges use primary text on a 14 percent tint.

struct Sample {
    let name: String
    let foreground: NSColor
    let background: NSColor
    let minimum: CGFloat
}

func resolve(_ color: NSColor, _ appearance: NSAppearance.Name) -> NSColor {
    let app = NSAppearance(named: appearance)!
    var result: NSColor!
    app.performAsCurrentDrawingAppearance {
        result = color.usingColorSpace(.sRGB) ?? NSColor(srgbRed: 0, green: 0, blue: 0, alpha: 1)
    }
    return result
}

func composite(_ foreground: NSColor, _ alpha: CGFloat, over background: NSColor) -> NSColor {
    NSColor(
        srgbRed: foreground.redComponent * alpha + background.redComponent * (1 - alpha),
        green: foreground.greenComponent * alpha + background.greenComponent * (1 - alpha),
        blue: foreground.blueComponent * alpha + background.blueComponent * (1 - alpha),
        alpha: 1
    )
}

func luminance(_ color: NSColor) -> CGFloat {
    func linear(_ value: CGFloat) -> CGFloat {
        value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * linear(color.redComponent)
        + 0.7152 * linear(color.greenComponent)
        + 0.0722 * linear(color.blueComponent)
}

func contrast(_ a: NSColor, _ b: NSColor) -> CGFloat {
    let first = luminance(a)
    let second = luminance(b)
    return (max(first, second) + 0.05) / (min(first, second) + 0.05)
}

let categories: [(String, NSColor)] = [
    ("folder", .systemBlue),
    ("document", .systemIndigo),
    ("image", .systemPink),
    ("video", .systemRed),
    ("audio", .systemOrange),
    ("archive", .systemTeal),
    ("code", .systemGreen),
    ("other", .systemGray),
]

let methods: [(String, NSColor)] = [
    ("lzma2", .systemPurple),
    ("deflate", .systemBlue),
    ("bzip2", .systemOrange),
    ("ppmd", .systemIndigo),
    ("zstd", .systemTeal),
    ("store", .systemGray),
]

var failures = 0

for appearance in [NSAppearance.Name.aqua, .darkAqua] {
    let appearanceName = appearance == .aqua ? "light" : "dark"
    let card = resolve(.controlBackgroundColor, appearance)
    let window = resolve(.windowBackgroundColor, appearance)
    let inspector = resolve(.underPageBackgroundColor, appearance)
    let label = resolve(.labelColor, appearance)
    let secondary = composite(label, 0.70, over: card)
    let faint = composite(label, 0.56, over: card)

    var samples: [Sample] = [
        Sample(name: "primary on card", foreground: label, background: card, minimum: 4.5),
        Sample(name: "primary on window", foreground: label, background: window, minimum: 4.5),
        Sample(name: "primary on inspector", foreground: label, background: inspector, minimum: 4.5),
        Sample(name: "secondary on card", foreground: secondary, background: card, minimum: 4.5),
        Sample(name: "secondary on window",
               foreground: composite(label, 0.70, over: window),
               background: window,
               minimum: 4.5),
        Sample(name: "faint on card", foreground: faint, background: card, minimum: 4.5),
        Sample(name: "faint on window",
               foreground: composite(label, 0.56, over: window),
               background: window,
               minimum: 4.5),
        Sample(name: "faint on inspector",
               foreground: composite(label, 0.56, over: inspector),
               background: inspector,
               minimum: 4.5),
    ]

    for (name, color) in categories + methods {
        let tint = composite(resolve(color, appearance), 0.14, over: card)
        samples.append(Sample(name: "primary on \(name) tint",
                              foreground: label,
                              background: tint,
                              minimum: 4.5))
    }

    for sample in samples {
        let ratio = contrast(sample.foreground, sample.background)
        let status = ratio >= sample.minimum ? "PASS" : "FAIL"
        print("\(appearanceName.padding(toLength: 5, withPad: " ", startingAt: 0)) \(status) \(String(format: "%5.2f", ratio))  \(sample.name)")
        if ratio < sample.minimum {
            failures += 1
        }
    }
}

if failures > 0 {
    print("contrast-check: FAIL (\(failures) pairs below 4.5:1)")
    exit(1)
}
print("contrast-check: PASS")
