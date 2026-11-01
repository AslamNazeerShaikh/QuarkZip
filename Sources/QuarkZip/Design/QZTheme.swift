import AppKit
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
    }

    enum Size {
        static let sidebar: CGFloat = 220
        static let minWindowWidth: CGFloat = 900
        static let minWindowHeight: CGFloat = 560
        static let row: CGFloat = 28
        static let toolbar: CGFloat = 52
        static let statusBar: CGFloat = 28
        static let inspector: CGFloat = 280
    }

    enum Typography {
        static let title = Font.system(size: 22, weight: .semibold)
        static let heading = Font.system(size: 15, weight: .semibold)
        static let body = Font.system(size: 13)
        static let callout = Font.system(size: 12)
        static let caption = Font.system(size: 11)
        static let metric = Font.system(size: 12, design: .monospaced)
    }

    enum Palette {
        static let background = Color(nsColor: .windowBackgroundColor)
        static let surface = Color(nsColor: .controlBackgroundColor)
        static let raised = Color(nsColor: .underPageBackgroundColor)
        static let separator = Color(nsColor: .separatorColor)
        static let primary = Color(nsColor: .labelColor)
        static let secondary = Color(nsColor: .secondaryLabelColor)
        static let tertiary = Color(nsColor: .tertiaryLabelColor)
        static let accent = Color.accentColor
        static let success = Color(nsColor: .systemGreen)
        static let warning = Color(nsColor: .systemOrange)
        static let danger = Color(nsColor: .systemRed)
    }

    enum Motion {
        static let instant = Animation.easeOut(duration: 0.10)
        static let quick = Animation.easeOut(duration: 0.16)
        static let standard = Animation.spring(response: 0.28, dampingFraction: 0.86)
        static let gentle = Animation.spring(response: 0.42, dampingFraction: 0.90)
    }
}

private struct ReduceMotionKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var qzReduceMotion: Bool {
        get { self[ReduceMotionKey.self] }
        set { self[ReduceMotionKey.self] = newValue }
    }
}
