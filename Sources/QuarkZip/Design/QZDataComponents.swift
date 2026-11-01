import QuarkZipKit
import SwiftUI

/// A raised content card used by the header, inspector, and dashboard.
struct QZCard<Content: View>: View {
    var padding: CGFloat = QZTheme.Space.card
    @ViewBuilder var content: Content

    init(padding: CGFloat = QZTheme.Space.card,
         @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(QZTheme.Palette.card,
                        in: RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous)
                    .strokeBorder(QZTheme.Palette.cardBorder, lineWidth: 0.5)
            }
    }
}

/// Rounded, tinted square that carries a category color.
struct QZIconTile: View {
    let symbol: String
    let tint: Color
    var size: CGFloat = QZTheme.Size.iconTile

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: size * 0.46, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: size, height: size)
            .background(QZTheme.Palette.soft(tint),
                        in: RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                    .strokeBorder(QZTheme.Palette.outline(tint), lineWidth: 0.5)
            }
            .accessibilityHidden(true)
    }
}

/// Compact colored tag for formats, methods, and states.
struct QZBadge: View {
    let text: String
    var tint: Color = QZTheme.Palette.secondary
    var symbol: String?
    var monospaced = false

    var body: some View {
        HStack(spacing: 3) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(tint)
            } else {
                Circle()
                    .fill(tint)
                    .frame(width: 5, height: 5)
            }
            Text(text)
                .font(monospaced ? QZTheme.Typography.metric : QZTheme.Typography.badge)
                .foregroundStyle(QZTheme.Palette.primary)
                .lineLimit(1)
        }
        .padding(.horizontal, QZTheme.Space.s)
        .padding(.vertical, QZTheme.Space.xs)
        .background(QZTheme.Palette.soft(tint),
                    in: RoundedRectangle(cornerRadius: QZTheme.Radius.badge, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: QZTheme.Radius.badge, style: .continuous)
                .strokeBorder(QZTheme.Palette.outline(tint), lineWidth: 0.5)
        }
    }
}

/// Dense KPI block for the archive header and dashboard.
struct QZStatCard: View {
    let label: String
    let value: String
    let symbol: String
    let tint: Color
    var detail: String?

    var body: some View {
        HStack(spacing: QZTheme.Space.s) {
            QZIconTile(symbol: symbol, tint: tint, size: 24)
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(QZTheme.Typography.statValue)
                    .monospacedDigit()
                    .foregroundStyle(QZTheme.Palette.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                HStack(spacing: QZTheme.Space.xxs) {
                    Text(label.uppercased())
                        .font(QZTheme.Typography.section)
                        .foregroundStyle(QZTheme.Palette.textFaint)
                    if let detail {
                        Text(detail)
                            .font(QZTheme.Typography.micro)
                            .foregroundStyle(QZTheme.Palette.textFaint)
                    }
                }
            }
        }
        .padding(.horizontal, QZTheme.Space.m)
        .padding(.vertical, QZTheme.Space.s)
        .frame(minWidth: 96, alignment: .leading)
        .background(QZTheme.Palette.card,
                    in: RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
                .strokeBorder(QZTheme.Palette.cardBorder, lineWidth: 0.5)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }
}

/// Selectable filter pill with an optional count.
struct QZFilterChip: View {
    let title: String
    var count: Int?
    var tint: Color = QZTheme.Palette.accent
    let isSelected: Bool
    let action: () -> Void

    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: QZTheme.Space.xs) {
                Circle()
                    .fill(tint)
                    .frame(width: 6, height: 6)
                Text(title)
                    .font(QZTheme.Typography.badge)
                    .fontWeight(isSelected ? .semibold : .medium)
                    .foregroundStyle(isSelected ? QZTheme.Palette.primary : QZTheme.Palette.textSecondary)
                if let count {
                    Text("\(count)")
                        .font(QZTheme.Typography.micro)
                        .monospacedDigit()
                        .foregroundStyle(QZTheme.Palette.textFaint)
                }
            }
            .padding(.horizontal, QZTheme.Space.s)
            .frame(height: QZTheme.Size.chip)
            .background {
                Capsule().fill(background)
            }
            .overlay {
                Capsule()
                    .strokeBorder(isSelected ? QZTheme.Palette.outline(tint)
                                             : QZTheme.Palette.separator.opacity(0.55),
                                  lineWidth: 0.5)
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var background: Color {
        if isSelected { return QZTheme.Palette.soft(tint) }
        if hovering { return QZTheme.Palette.hover }
        return QZTheme.Palette.content.opacity(0.55)
    }
}

/// Uppercase section label used inside cards and the inspector.
struct QZSectionLabel: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(QZTheme.Typography.section)
                .tracking(0.6)
                .foregroundStyle(QZTheme.Palette.textFaint)
            Spacer(minLength: 0)
            if let trailing {
                Text(trailing)
                    .font(QZTheme.Typography.micro)
                    .foregroundStyle(QZTheme.Palette.textFaint)
                    .monospacedDigit()
            }
        }
    }
}

/// Slim compression bar. Nil draws the empty track.
struct QZRatioBar: View {
    let value: Double?
    var tint: Color?
    var height: CGFloat = 4

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(QZTheme.Palette.dataTrack)
                if let value, value.isFinite {
                    Capsule()
                        .fill(tint ?? QZTheme.Palette.ratio(value))
                        .frame(width: max(2, proxy.size.width * min(max(value, 0), 1)))
                }
            }
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

/// Stacked composition bar for the archive inspector.
struct QZCompositionBar: View {
    let stats: [CategoryStat]
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { proxy in
            let total = stats.reduce(UInt64(0)) { $0 &+ $1.bytes }
            ZStack(alignment: .leading) {
                Capsule().fill(QZTheme.Palette.dataTrack)
                if total > 0 {
                    HStack(spacing: 1) {
                        ForEach(stats.filter { $0.bytes > 0 }) { stat in
                            Rectangle()
                                .fill(QZTheme.Palette.category(stat.category))
                                .frame(width: max(2, proxy.size.width * CGFloat(stat.bytes) / CGFloat(total)))
                        }
                    }
                    .clipShape(Capsule())
                }
            }
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

/// Label and value pair for the inspector.
struct QZInspectorField: View {
    let label: String
    let value: String
    var tint: Color?
    var monospaced = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: QZTheme.Space.s) {
            Text(label)
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.textFaint)
                .frame(width: 80, alignment: .leading)
            if let tint {
                Circle()
                    .fill(tint)
                    .frame(width: 6, height: 6)
                    .alignmentGuide(.firstTextBaseline) { $0[VerticalAlignment.center] + 4 }
            }
            Text(value)
                .font(monospaced ? QZTheme.Typography.metric : QZTheme.Typography.bodyStrong)
                .foregroundStyle(QZTheme.Palette.primary)
                .textSelection(.enabled)
                .lineLimit(2)
                .truncationMode(.middle)
            Spacer(minLength: 0)
        }
    }
}

/// Sidebar row with a tinted icon, optional emoji, label, and count.
struct QZSidebarRow: View {
    let symbol: String
    let title: String
    var tint: Color = QZTheme.Palette.accent
    var dot: Color?
    var count: Int?
    var isSelected = false
    var emoji: String?
    let action: () -> Void

    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: QZTheme.Space.s) {
                HStack(spacing: QZTheme.Space.xs) {
                    if let emoji {
                        QZEmoji(emoji: emoji)
                    }
                    Image(systemName: symbol)
                        .font(QZTheme.Typography.rowIcon)
                        .foregroundStyle(tint)
                        .accessibilityHidden(true)
                    if let dot {
                        Circle()
                            .fill(dot)
                            .frame(width: 6, height: 6)
                            .accessibilityHidden(true)
                    }
                }
                .frame(width: emoji == nil ? 24 : 48, alignment: .leading)

                Text(title)
                    .font(QZTheme.Typography.callout)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(isSelected ? QZTheme.Palette.primary : QZTheme.Palette.textSecondary)
                    .lineLimit(1)
                Spacer(minLength: QZTheme.Space.xs)
                if let count {
                    Text("\(count)")
                        .font(QZTheme.Typography.microMono)
                        .fontWeight(.medium)
                        .foregroundStyle(QZTheme.Palette.textFaint)
                        .padding(.horizontal, QZTheme.Space.s)
                        .padding(.vertical, QZTheme.Space.xs)
                        .background(QZTheme.Palette.dataTrack, in: Capsule())
                }
            }
            .padding(.horizontal, QZTheme.Space.s)
            .frame(height: QZTheme.Size.rowCompact)
            .background {
                RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
                    .fill(isSelected ? QZTheme.Palette.soft(QZTheme.Palette.accent)
                                     : (hovering ? QZTheme.Palette.hover : .clear))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Color for a compression method, so methods scan like categories.
enum QZMethodStyle {
    static func color(for method: String?) -> Color {
        guard let method = method?.lowercased(), !method.isEmpty else {
            return QZTheme.Palette.tertiary
        }
        if method.contains("lzma") { return Color(nsColor: .systemPurple) }
        if method.contains("deflate") || method.contains("zip") { return Color(nsColor: .systemBlue) }
        if method.contains("bzip") { return Color(nsColor: .systemOrange) }
        if method.contains("ppmd") { return Color(nsColor: .systemIndigo) }
        if method.contains("zstd") { return Color(nsColor: .systemTeal) }
        if method.contains("store") || method.contains("copy") { return QZTheme.Palette.secondary }
        return QZTheme.Palette.secondary
    }
}

/// Colors for archive formats, used by recent rows and format badges.
enum QZFormatStyle {
    static func color(for format: String?) -> Color {
        switch format?.lowercased() {
        case "7z":
            return QZTheme.Palette.category(.archive)
        case "zip", "jar", "war":
            return QZTheme.Palette.info
        case "tar":
            return QZTheme.Palette.category(.code)
        case "gz", "gzip", "tgz":
            return QZTheme.Palette.category(.audio)
        case "xz", "txz", "lzma":
            return QZTheme.Palette.category(.document)
        case "bz2", "bzip2", "tbz2":
            return QZTheme.Palette.category(.video)
        case "rar":
            return QZTheme.Palette.warning
        default:
            return QZTheme.Palette.secondary
        }
    }
}

/// Compact secondary action used in the inspector and dashboard.
struct QZSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(QZTheme.Typography.caption.weight(.medium))
            .foregroundStyle(QZTheme.Palette.textSecondary)
            .padding(.horizontal, QZTheme.Space.m)
            .frame(height: 24)
            .background(QZTheme.Palette.card,
                        in: RoundedRectangle(cornerRadius: QZTheme.Radius.badge, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: QZTheme.Radius.badge, style: .continuous)
                    .strokeBorder(QZTheme.Palette.cardBorder, lineWidth: 0.5)
            }
            .opacity(configuration.isPressed ? 0.65 : 1)
            .contentShape(Rectangle())
    }
}
