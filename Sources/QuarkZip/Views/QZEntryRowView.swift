import QuarkZipKit
import SwiftUI

/// Actions a row can trigger. Held by the parent, which owns the model.
struct QZEntryRowActions {
    var open: (ArchiveEntry) -> Void
    var select: (ArchiveEntry) -> Void
    var copyPath: (ArchiveEntry) -> Void
    var copyName: (ArchiveEntry) -> Void
}

/// One entry row. Deliberately dumb: every input is a value, so `.equatable`
/// in the parent skips rows whose inputs did not change. Selection changes
/// and keystrokes then re-render only the affected rows instead of the whole
/// visible window.
///
/// Invariant: `actions` is excluded from `==` on purpose. The closures capture
/// the shared model object and the row's own entry, so a skipped render keeps
/// behaviorally identical actions. Comparing them would defeat the caching.
struct QZEntryRowView: View, Equatable {
    let entry: ArchiveEntry
    let isSelected: Bool
    let showEmoji: Bool
    let metricsVisible: Bool
    let rowHeight: CGFloat
    var actions: QZEntryRowActions

    static func == (lhs: QZEntryRowView, rhs: QZEntryRowView) -> Bool {
        lhs.entry == rhs.entry
            && lhs.isSelected == rhs.isSelected
            && lhs.showEmoji == rhs.showEmoji
            && lhs.metricsVisible == rhs.metricsVisible
            && lhs.rowHeight == rhs.rowHeight
    }

    private var category: EntryCategory { EntryCategory.of(entry) }

    private var ratio: Double? {
        guard entry.kind == .file,
              entry.size > 0,
              let packed = entry.packedSize,
              metricsVisible == true else { return nil }
        return Double(packed) / Double(entry.size)
    }

    var body: some View {
        HStack(spacing: QZTheme.Space.s) {
            HStack(spacing: QZTheme.Space.xs) {
                if showEmoji {
                    QZEmoji(emoji: category.emoji)
                }
                Image(systemName: category.outlineSymbolName)
                    .font(QZTheme.Typography.rowIcon)
                    .foregroundStyle(QZTheme.Palette.category(category))
                    .frame(width: 14)
                    .accessibilityHidden(true)
                Text(entry.name)
                    .font(QZTheme.Typography.body)
                    .foregroundStyle(QZTheme.Palette.primary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())

            HStack(spacing: QZTheme.Space.xs) {
                Circle()
                    .fill(QZTheme.Palette.category(category))
                    .frame(width: 6, height: 6)
                Text(category.displayName)
                    .font(QZTheme.Typography.badge)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
                    .lineLimit(1)
            }
            .frame(width: 92, alignment: .leading)
            .accessibilityHidden(showEmoji)

            Text(entry.kind == .folder ? "—" : EntryFormat.bytes(entry.size))
                .font(QZTheme.Typography.metric)
                .foregroundStyle(QZTheme.Palette.textSecondary)
                .frame(width: 76, alignment: .trailing)
                .monospacedDigit()

            Text(metricsVisible
                ? EntryFormat.packed(entry.packedSize)
                : "—")
                .font(QZTheme.Typography.metric)
                .foregroundStyle(QZTheme.Palette.textSecondary)
                .frame(width: 76, alignment: .trailing)
                .monospacedDigit()

            ratioCell
                .frame(width: 72, alignment: .trailing)

            Text(EntryFormat.shortDate(entry.modified))
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.textSecondary)
                .frame(width: 96, alignment: .leading)
                .lineLimit(1)

            methodCell
                .frame(width: 88, alignment: .leading)

            Group {
                if entry.isEncrypted {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(QZTheme.Palette.warning)
                        .help("Encrypted entry")
                        .accessibilityHidden(true)
                } else {
                    Color.clear.frame(width: 10, height: 10)
                }
            }
            .frame(width: 20, alignment: .center)
        }
        .frame(height: rowHeight)
        .contentShape(Rectangle())
        .onTapGesture(count: 2) {
            actions.open(entry)
        }
        .contextMenu {
            if entry.kind == .folder {
                Button("Open Folder") { actions.open(entry) }
            }
            Button("Show in Inspector") { actions.select(entry) }
            Divider()
            Button("Copy Path") { actions.copyPath(entry) }
            Button("Copy Name") { actions.copyName(entry) }
        }
        .help(entry.path.description)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(entry.name), \(category.displayName)")
    }

    private var ratioCell: some View {
        VStack(alignment: .trailing, spacing: QZTheme.Space.xxs) {
            Text(EntryFormat.ratio(ratio))
                .font(QZTheme.Typography.microMono)
                .foregroundStyle(ratio == nil
                    ? QZTheme.Palette.textFaint
                    : QZTheme.Palette.textSecondary)
            QZRatioBar(value: ratio, height: 4)
                .frame(width: 44)
        }
        .accessibilityLabel("Compression ratio \(EntryFormat.ratio(ratio))")
    }

    private var methodCell: some View {
        Group {
            if let method = entry.method, !method.isEmpty {
                QZBadge(text: method,
                        tint: QZMethodStyle.color(for: method),
                        monospaced: true)
            } else {
                Text("—")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textFaint)
            }
        }
    }
}
