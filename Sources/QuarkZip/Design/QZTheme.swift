import AppKit
import QuarkZipKit
import SwiftUI

/// Design tokens. Views read these, never literals.
///
/// The values are the contract in `docs/design/design-system.md`.
enum QZTheme {
    enum Space {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 12
        static let l: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
        static let huge: CGFloat = 40
        static let giant: CGFloat = 48
        /// Window and page margin. Equals xl, named for intent.
        static let margin: CGFloat = 20
        /// Default card padding. Equals l, named for intent.
        static let card: CGFloat = 16
        /// Default group gap inside cards and rails.
        static let group: CGFloat = 12
    }

    enum Radius {
        static let control: CGFloat = 6
        static let card: CGFloat = 10
        static let panel: CGFloat = 14
        static let chrome: CGFloat = 20
        static let badge: CGFloat = 5
    }

    enum Size {
        static let pane: CGFloat = 264
        static let paneMin: CGFloat = 220
        static let paneMax: CGFloat = 320
        static let minWindowWidth: CGFloat = 1200
        static let minWindowHeight: CGFloat = 720
        static let defaultWindowWidth: CGFloat = 1360
        static let defaultWindowHeight: CGFloat = 800
        static let maxWindowWidth: CGFloat = 1680
        static let maxWindowHeight: CGFloat = 1050
        static let rowCompact: CGFloat = 28
        static let rowComfortable: CGFloat = 32
        static let header: CGFloat = 68
        static let filterBar: CGFloat = 44
        static let statusBar: CGFloat = 28
        static let iconTile: CGFloat = 34
        static let iconTileSmall: CGFloat = 22
        static let chip: CGFloat = 24
        static let emojiBox: CGFloat = 20
    }

    enum Typography {
        static let display = Font.system(size: 26, weight: .bold)
        static let title = Font.system(size: 22, weight: .semibold)
        static let headline = Font.system(size: 15, weight: .semibold)
        static let body = Font.system(size: 13)
        static let bodyStrong = Font.system(size: 13, weight: .medium)
        static let callout = Font.system(size: 12)
        static let caption = Font.system(size: 11)
        static let micro = Font.system(size: 10)
        static let section = Font.system(size: 10.5, weight: .semibold)
        static let badge = Font.system(size: 10.5, weight: .medium)
        static let metric = Font.system(size: 12, design: .monospaced)
        static let microMono = Font.system(size: 10, design: .monospaced)
        static let metricLarge = Font.system(size: 18, weight: .semibold, design: .monospaced)
        static let statValue = Font.system(size: 15, weight: .semibold, design: .monospaced)
        static let miniValue = Font.system(size: 14, weight: .semibold, design: .monospaced)
        static let rowIcon = Font.system(size: 12, weight: .medium)
        static let rowGlyph = Font.system(size: 11, weight: .medium)
        static let emoji = Font.system(size: 13)
    }

    enum Palette {
        static let background = Color(nsColor: .windowBackgroundColor)
        static let content = Color(nsColor: .textBackgroundColor)
        static let card = Color(nsColor: .controlBackgroundColor)
        static let inspector = Color(nsColor: .underPageBackgroundColor)
        static let separator = Color(nsColor: .separatorColor)
        static let primary = Color(nsColor: .labelColor)

        /// Text hierarchy measured against card and window backgrounds.
        /// System secondary is 3.95:1 in light and system tertiary is 1.88:1,
        /// below the HIG 4.5:1 floor for small text.
        static let textSecondary = Color.primary.opacity(0.70)
        static let textFaint = Color.primary.opacity(0.56)

        /// Decorative only: icons, separators, disabled glyphs, dashes.
        /// Never use these for functional text.
        static let secondary = Color(nsColor: .secondaryLabelColor)
        static let tertiary = Color(nsColor: .tertiaryLabelColor)
        static let accent = Color.accentColor
        static let success = Color(nsColor: .systemGreen)
        static let warning = Color(nsColor: .systemOrange)
        static let danger = Color(nsColor: .systemRed)
        static let info = Color(nsColor: .systemBlue)

        static let hover = Color.primary.opacity(0.045)
        static let selection = Color.accentColor.opacity(0.13)
        static let selectionBorder = Color.accentColor.opacity(0.28)
        static let dataTrack = Color.primary.opacity(0.08)
        static let cardBorder = Color(nsColor: .separatorColor).opacity(0.55)
        static let headerBackground = Color(nsColor: .controlBackgroundColor)
        static let filterBackground = Color(nsColor: .controlBackgroundColor)

        static func category(_ category: EntryCategory) -> Color {
            switch category {
            case .folder: return Color(nsColor: .systemBlue)
            case .document: return Color(nsColor: .systemIndigo)
            case .image: return Color(nsColor: .systemPink)
            case .video: return Color(nsColor: .systemRed)
            case .audio: return Color(nsColor: .systemOrange)
            case .archive: return Color(nsColor: .systemTeal)
            case .code: return Color(nsColor: .systemGreen)
            case .other: return Color(nsColor: .systemGray)
            }
        }

        static func soft(_ color: Color) -> Color {
            color.opacity(0.14)
        }

        static func outline(_ color: Color) -> Color {
            color.opacity(0.30)
        }

        /// Green for strong compression, amber for weak, red for expansion.
        static func ratio(_ value: Double) -> Color {
            switch value {
            case ..<0.45: return Color(nsColor: .systemGreen)
            case ..<0.80: return Color(nsColor: .systemOrange)
            default: return Color(nsColor: .systemRed)
            }
        }
    }

    enum Motion {
        static let instant = Animation.easeOut(duration: 0.10)
        static let quick = Animation.easeOut(duration: 0.16)
        static let standard = Animation.spring(response: 0.32, dampingFraction: 0.94)
        static let gentle = Animation.spring(response: 0.42, dampingFraction: 1.0)
        static let reduced = Animation.easeOut(duration: 0.12)
    }
}

/// Row density chosen in Settings.
enum QZDensity: String, CaseIterable, Identifiable {
    case compact
    case comfortable

    var id: String { rawValue }

    var title: String {
        switch self {
        case .compact: return "Compact"
        case .comfortable: return "Comfortable"
        }
    }

    var rowHeight: CGFloat {
        switch self {
        case .compact: return QZTheme.Size.rowCompact
        case .comfortable: return QZTheme.Size.rowComfortable
        }
    }
}

/// Appearance override applied at runtime via preferredColorScheme.
enum QZAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}

/// Motion that respects the accessibility setting.
enum QZMotion {
    static func animation(_ base: Animation, reduceMotion: Bool) -> Animation {
        reduceMotion ? QZTheme.Motion.reduced : base
    }
}
