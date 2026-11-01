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
    }

    enum Radius {
        static let control: CGFloat = 6
        static let card: CGFloat = 10
        static let panel: CGFloat = 14
        static let chrome: CGFloat = 20
        static let badge: CGFloat = 5
    }

    enum Size {
        static let sidebar: CGFloat = 230
        static let minWindowWidth: CGFloat = 1120
        static let minWindowHeight: CGFloat = 640
        static let rowCompact: CGFloat = 24
        static let rowComfortable: CGFloat = 30
        static let header: CGFloat = 68
        static let filterBar: CGFloat = 44
        static let statusBar: CGFloat = 26
        static let inspector: CGFloat = 310
        static let iconTile: CGFloat = 34
        static let iconTileSmall: CGFloat = 22
        static let chip: CGFloat = 22
    }

    enum Typography {
        static let display = Font.system(size: 26, weight: .bold, design: .rounded)
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
    }

    enum Palette {
        static let background = Color(nsColor: .windowBackgroundColor)
        static let content = Color(nsColor: .textBackgroundColor)
        static let card = Color(nsColor: .controlBackgroundColor)
        static let inspector = Color(nsColor: .underPageBackgroundColor)
        static let separator = Color(nsColor: .separatorColor)
        static let primary = Color(nsColor: .labelColor)
        static let secondary = Color(nsColor: .secondaryLabelColor)
        static let tertiary = Color(nsColor: .tertiaryLabelColor)
        static let accent = Color.accentColor
        static let success = Color(nsColor: .systemGreen)
        static let warning = Color(nsColor: .systemOrange)
        static let danger = Color(nsColor: .systemRed)
        static let info = Color(nsColor: .systemBlue)

        static let hover = Color.primary.opacity(0.045)
        static let selection = Color.accentColor.opacity(0.14)
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
        static let standard = Animation.spring(response: 0.28, dampingFraction: 0.86)
        static let gentle = Animation.spring(response: 0.42, dampingFraction: 0.90)
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

/// Accent choices offered in Settings. Category colors stay semantic and do
/// not follow this choice.
enum AccentChoice: String, CaseIterable, Identifiable {
    case blue
    case indigo
    case purple
    case pink
    case red
    case orange
    case green
    case teal
    case graphite

    var id: String { rawValue }

    var title: String {
        rawValue.capitalized
    }

    var color: Color {
        switch self {
        case .blue: return Color(nsColor: .systemBlue)
        case .indigo: return Color(nsColor: .systemIndigo)
        case .purple: return Color(nsColor: .systemPurple)
        case .pink: return Color(nsColor: .systemPink)
        case .red: return Color(nsColor: .systemRed)
        case .orange: return Color(nsColor: .systemOrange)
        case .green: return Color(nsColor: .systemGreen)
        case .teal: return Color(nsColor: .systemTeal)
        case .graphite: return Color(nsColor: .systemGray)
        }
    }
}
