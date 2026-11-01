import QuarkZipKit
import SwiftUI
import UniformTypeIdentifiers

struct WelcomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("showEmoji") private var showEmoji = false
    @State private var isTargeted = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: QZTheme.Space.l) {
                header
                stats
                HStack(alignment: .top, spacing: QZTheme.Space.l) {
                    dropCard
                    recentCard
                        .frame(width: 360)
                }
                capabilities
                footer
            }
            .padding(QZTheme.Space.margin)
            .frame(maxWidth: 1180, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background {
            QZTheme.Palette.background
            LinearGradient(colors: [QZTheme.Palette.ambientTop,
                                    QZTheme.Palette.ambientBottom],
                           startPoint: .top, endPoint: .bottom)
        }
        .dropDestination(for: URL.self) { urls, _ in
            guard let url = urls.first(where: { $0.isFileURL }) else { return false }
            model.open(url)
            return true
        } isTargeted: { targeted in
            withAnimation(QZMotion.animation(QZTheme.Motion.quick, reduceMotion: reduceMotion)) {
                isTargeted = targeted
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
            QZSectionLabel(title: "Workspace")
            HStack(spacing: QZTheme.Space.s) {
                if showEmoji {
                    QZEmoji(emoji: "🗜️", label: "Archive workspace")
                }
                Text("Your archive workspace")
                    .font(QZTheme.Typography.display)
                    .foregroundStyle(QZTheme.Palette.primary)
            }
            Text("Inspect what is inside an archive without unpacking it. Everything runs on this Mac.")
                .font(QZTheme.Typography.body)
                .foregroundStyle(QZTheme.Palette.textSecondary)
        }
    }

    private var stats: some View {
        HStack(spacing: QZTheme.Space.s) {
            QZStatCard(label: "Recent",
                       value: "\(model.recents.count)",
                       symbol: "clock.fill",
                       tint: QZTheme.Palette.accent)
            QZStatCard(label: "Formats",
                       value: "20+",
                       symbol: "square.stack.3d.up.fill",
                       tint: QZTheme.Palette.category(.image))
            QZStatCard(label: "Engine",
                       value: "26.05",
                       symbol: "gearshape.2.fill",
                       tint: QZTheme.Palette.category(.archive),
                       detail: "7-Zip")
            QZStatCard(label: "Privacy",
                       value: "Offline",
                       symbol: "lock.shield.fill",
                       tint: QZTheme.Palette.success)
        }
    }

    private var dropCard: some View {
        QZGlassCard(padding: 0) {
            VStack(spacing: 0) {
                VStack(spacing: QZTheme.Space.s) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        QZTheme.Palette.accent.opacity(0.20),
                                        QZTheme.Palette.category(.archive).opacity(0.12),
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 64, height: 64)
                        Image(systemName: "arrow.down.doc.fill")
                            .font(.system(size: 26, weight: .medium))
                            .foregroundStyle(QZTheme.Palette.accent)
                    }
                    Text("Drop an archive to inspect it")
                        .font(QZTheme.Typography.headline)
                        .foregroundStyle(QZTheme.Palette.primary)
                    Text("Browse entries, check sizes and methods, and see exactly what is inside.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 380)
                    Button {
                        model.chooseArchive()
                    } label: {
                        Label("Choose Archive…", systemImage: "folder")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.regular)
                    .padding(.top, QZTheme.Space.xxs)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, QZTheme.Space.xxl + QZTheme.Space.s)
                .background(isTargeted
                            ? QZTheme.Palette.accent.opacity(0.08)
                            : QZTheme.Palette.content)
                .overlay {
                    RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous)
                        .strokeBorder(
                            isTargeted ? QZTheme.Palette.accent : QZTheme.Palette.separator,
                            style: StrokeStyle(lineWidth: isTargeted ? 2 : 1, dash: isTargeted ? [] : [7, 5])
                        )
                        .padding(QZTheme.Space.s)
                        .animation(QZMotion.animation(QZTheme.Motion.quick, reduceMotion: reduceMotion),
                                   value: isTargeted)
                }

                Divider()

                VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                    QZSectionLabel(title: "Supported formats", trailing: "open · browse · inspect")
                    HStack(spacing: QZTheme.Space.xs) {
                        QZBadge(text: "7Z", tint: QZTheme.Palette.category(.archive), monospaced: true)
                        QZBadge(text: "ZIP", tint: QZTheme.Palette.info, monospaced: true)
                        QZBadge(text: "TAR", tint: QZTheme.Palette.category(.code), monospaced: true)
                        QZBadge(text: "GZ", tint: QZTheme.Palette.category(.audio), monospaced: true)
                        QZBadge(text: "XZ", tint: QZTheme.Palette.category(.document), monospaced: true)
                        QZBadge(text: "BZ2", tint: QZTheme.Palette.category(.video), monospaced: true)
                        QZBadge(text: "RAR", tint: QZTheme.Palette.warning, monospaced: true)
                        QZBadge(text: "ISO", tint: QZTheme.Palette.secondary, monospaced: true)
                    }
                }
                .padding(QZTheme.Space.m)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(QZTheme.Palette.headerBackground)
            }
        }
    }

    private var recentCard: some View {
        QZGlassCard {
            VStack(alignment: .leading, spacing: QZTheme.Space.s) {
                QZSectionLabel(title: "Recent Archives",
                               trailing: model.recents.isEmpty ? nil : "\(model.recents.count)")

                if model.recents.isEmpty {
                    VStack(spacing: QZTheme.Space.xs) {
                        Image(systemName: "clock.badge.questionmark")
                            .font(.system(size: 22, weight: .light))
                            .foregroundStyle(QZTheme.Palette.textFaint)
                        Text("No archives yet")
                            .font(QZTheme.Typography.bodyStrong)
                            .foregroundStyle(QZTheme.Palette.textSecondary)
                        Text("Open one and it will appear here.")
                            .font(QZTheme.Typography.caption)
                            .foregroundStyle(QZTheme.Palette.textFaint)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, QZTheme.Space.xxl)
                } else {
                    ForEach(model.recents.prefix(6), id: \.self) { url in
                        recentRow(url)
                    }
                }

                Spacer(minLength: 0)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
    }

    private func recentRow(_ url: URL) -> some View {
        let category = EntryCategory.of(fileName: url.lastPathComponent)
        let color = QZFormatStyle.color(for: url.pathExtension)
        return Button {
            model.open(url)
        } label: {
            HStack(spacing: QZTheme.Space.s) {
                if showEmoji {
                    QZEmoji(emoji: category.emoji, label: category.displayName)
                }
                QZIconTile(symbol: category.symbolName, tint: color, size: 26)
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                    Text(url.lastPathComponent)
                        .font(QZTheme.Typography.body)
                        .foregroundStyle(QZTheme.Palette.primary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Text(url.deletingLastPathComponent().path(percentEncoded: false))
                        .font(QZTheme.Typography.micro)
                        .foregroundStyle(QZTheme.Palette.textFaint)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                Spacer(minLength: QZTheme.Space.s)
                QZBadge(text: url.pathExtension.uppercased(), tint: color, monospaced: true)
            }
            .padding(.horizontal, QZTheme.Space.s)
            .padding(.vertical, QZTheme.Space.s)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var capabilities: some View {
        HStack(spacing: QZTheme.Space.l) {
            capabilityCard(
                symbol: "eye.fill",
                tint: QZTheme.Palette.info,
                emoji: showEmoji ? "👁️" : nil,
                title: "Browse without unpacking",
                text: "Open 7z, zip, tar, and more, then move through the folder tree."
            )
            capabilityCard(
                symbol: "line.3.horizontal.decrease.circle.fill",
                tint: QZTheme.Palette.category(.image),
                emoji: showEmoji ? "🔍" : nil,
                title: "Filter by what matters",
                text: "Narrow by file type, encryption, or size. Search the current folder."
            )
            capabilityCard(
                symbol: "doc.on.doc.fill",
                tint: QZTheme.Palette.category(.code),
                emoji: showEmoji ? "📋" : nil,
                title: "Copy exact paths",
                text: "Grab in-archive paths for scripts, terminals, and bug reports."
            )
        }
    }

    private func capabilityCard(symbol: String,
                                tint: Color,
                                emoji: String? = nil,
                                title: String,
                                text: String) -> some View {
        QZGlassCard {
            HStack(alignment: .top, spacing: QZTheme.Space.m) {
                if let emoji {
                    QZEmoji(emoji: emoji)
                }
                QZIconTile(symbol: symbol, tint: tint, size: 30)
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                    Text(title)
                        .font(QZTheme.Typography.bodyStrong)
                        .foregroundStyle(QZTheme.Palette.primary)
                    Text(text)
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .topLeading)
        }
    }

    private var footer: some View {
        HStack(spacing: QZTheme.Space.xs) {
            Circle()
                .fill(QZTheme.Palette.success)
                .frame(width: 6, height: 6)
            Text("Engine 7-Zip 26.05")
                .font(QZTheme.Typography.micro)
                .foregroundStyle(QZTheme.Palette.textFaint)
            Text("·")
                .foregroundStyle(QZTheme.Palette.textFaint)
            Text("No network access")
                .font(QZTheme.Typography.micro)
                .foregroundStyle(QZTheme.Palette.textFaint)
            Spacer()
            Text("LGPL-3.0")
                .font(QZTheme.Typography.micro)
                .foregroundStyle(QZTheme.Palette.textFaint)
        }
        .padding(.top, QZTheme.Space.xs)
    }
}
