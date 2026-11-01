import QuarkZipKit
import SwiftUI

/// CRM-style record header: identity on the left, colored KPIs on the right.
struct ArchiveHeaderView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        if let snapshot = model.snapshot {
            HStack(spacing: QZTheme.Space.m) {
                QZIconTile(symbol: "archivebox.fill",
                           tint: QZTheme.Palette.category(.archive),
                           size: 40)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: QZTheme.Space.xs) {
                        Text(snapshot.displayName)
                            .font(QZTheme.Typography.headline)
                            .foregroundStyle(QZTheme.Palette.primary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        QZBadge(text: (snapshot.formatName ?? "archive").uppercased(),
                                tint: QZFormatStyle.color(for: snapshot.formatName))
                        if snapshot.encryptedCount > 0 {
                            QZBadge(text: "\(snapshot.encryptedCount) encrypted",
                                    tint: QZTheme.Palette.warning,
                                    symbol: "lock.fill")
                        }
                    }
                    Text(model.archivePath)
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.tertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                .frame(minWidth: 160, alignment: .leading)
                .layoutPriority(2)

                Spacer(minLength: QZTheme.Space.xs)

                HStack(spacing: QZTheme.Space.xs) {
                    QZStatCard(label: "Files",
                               value: "\(snapshot.fileCount)",
                               symbol: "doc.on.doc.fill",
                               tint: QZTheme.Palette.category(.document))
                    QZStatCard(label: "Size",
                               value: EntryFormat.bytes(snapshot.totalUncompressedSize),
                               symbol: "internaldrive.fill",
                               tint: QZTheme.Palette.info)
                    QZStatCard(label: "Packed",
                               value: snapshot.showsCompressionMetrics
                                   ? EntryFormat.bytes(snapshot.totalPackedSize)
                                   : "—",
                               symbol: "arrow.down.right.and.arrow.up.left",
                               tint: QZTheme.Palette.category(.archive))
                    QZStatCard(label: "Ratio",
                               value: EntryFormat.ratio(snapshot.compressionRatio),
                               symbol: "chart.bar.fill",
                               tint: QZTheme.Palette.ratio(snapshot.compressionRatio ?? 1))
                }
            }
            .padding(.horizontal, QZTheme.Space.l)
            .frame(height: QZTheme.Size.header)
            .background(QZTheme.Palette.headerBackground)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(QZTheme.Palette.separator)
                    .frame(height: 1)
            }
        }
    }
}
