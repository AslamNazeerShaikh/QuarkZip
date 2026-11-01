import AppKit
import QuarkZipKit
import SwiftUI

/// Right rail: entry details, selection summary, or archive overview.
struct InspectorView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: QZTheme.Space.m) {
                QZSectionLabel(
                    title: model.selection.isEmpty ? "Archive Overview" : "Inspector",
                    trailing: model.selection.isEmpty ? nil : "\(model.selection.count) selected"
                )

                if let entry = model.selectedEntry {
                    EntryInspectorView(entry: entry)
                } else if model.selection.count > 1 {
                    SelectionInspectorView()
                } else if let snapshot = model.snapshot {
                    ArchiveInspectorView(snapshot: snapshot)
                }
            }
            .padding(QZTheme.Space.m)
        }
        .background(QZTheme.Palette.inspector)
    }
}

// MARK: - Single entry

private struct EntryInspectorView: View {
    @Environment(AppModel.self) private var model
    let entry: ArchiveEntry

    private var category: EntryCategory { EntryCategory.of(entry) }
    private var color: Color { QZTheme.Palette.category(category) }
    private var ratio: Double? {
        guard entry.kind == .file,
              entry.size > 0,
              let packed = entry.packedSize,
              model.snapshot?.showsCompressionMetrics == true else { return nil }
        return Double(packed) / Double(entry.size)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.m) {
            HStack(alignment: .top, spacing: QZTheme.Space.s) {
                QZIconTile(symbol: category.symbolName, tint: color, size: 40)
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs + 1) {
                    Text(entry.name)
                        .font(QZTheme.Typography.headline)
                        .lineLimit(2)
                        .truncationMode(.middle)
                    HStack(spacing: QZTheme.Space.xs) {
                        QZBadge(text: category.displayName, tint: color)
                        if entry.isEncrypted {
                            QZBadge(text: "Encrypted", tint: QZTheme.Palette.warning, symbol: "lock.fill")
                        }
                        if entry.kind == .folder {
                            QZBadge(text: "Folder", tint: QZTheme.Palette.category(.folder))
                        }
                    }
                }
            }

            QZCard(padding: QZTheme.Space.s) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                    QZSectionLabel(title: "Path", trailing: "\(entry.path.components.count) levels")
                    Text(entry.path.description)
                        .font(QZTheme.Typography.metric)
                        .foregroundStyle(QZTheme.Palette.secondary)
                        .textSelection(.enabled)
                        .lineLimit(3)
                        .truncationMode(.middle)
                }
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
            ], spacing: QZTheme.Space.xs) {
                QZMiniStat(label: "Size", value: EntryFormat.bytes(entry.size), tint: QZTheme.Palette.info)
                QZMiniStat(label: "Packed", value: EntryFormat.packed(entry.packedSize), tint: QZTheme.Palette.category(.archive))
                QZMiniStat(label: "Ratio", value: EntryFormat.ratio(ratio), tint: QZTheme.Palette.ratio(ratio ?? 1))
                QZMiniStat(label: "CRC", value: EntryFormat.crc(entry.crc), tint: QZTheme.Palette.secondary)
            }

            if entry.kind == .file, model.snapshot?.showsCompressionMetrics == true {
                QZCard(padding: QZTheme.Space.s + 2) {
                    VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                        QZSectionLabel(title: "Compression", trailing: EntryFormat.ratio(ratio))
                        QZRatioBar(value: ratio, height: 6)
                        HStack {
                            Text("Packed \(EntryFormat.packed(entry.packedSize))")
                            Spacer()
                            Text("Unpacked \(EntryFormat.bytes(entry.size))")
                        }
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.tertiary)
                    }
                }
            }

            QZCard(padding: QZTheme.Space.s + 2) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                    QZSectionLabel(title: "Details")
                    QZInspectorField(label: "Type", value: category.displayName, tint: color)
                    QZInspectorField(label: "Method", value: EntryFormat.method(entry.method),
                                     tint: QZMethodStyle.color(for: entry.method))
                    QZInspectorField(label: "Modified", value: EntryFormat.date(entry.modified))
                    QZInspectorField(label: "Encrypted", value: entry.isEncrypted ? "Yes" : "No",
                                     tint: entry.isEncrypted ? QZTheme.Palette.warning : nil)
                    QZInspectorField(label: "Attributes",
                                     value: entry.attributes == 0
                                        ? "—"
                                        : String(format: "0x%08X", entry.attributes),
                                     monospaced: true)
                    QZInspectorField(label: "Entry ID", value: entryIDDescription, monospaced: true)
                }
            }

            HStack(spacing: QZTheme.Space.xs) {
                Button {
                    model.copySelectedPaths()
                } label: {
                    Label("Copy Path", systemImage: "doc.on.doc")
                }
                .buttonStyle(QZSecondaryButtonStyle())

                Button {
                    model.copySelectedNames()
                } label: {
                    Label("Copy Name", systemImage: "textformat")
                }
                .buttonStyle(QZSecondaryButtonStyle())
            }
        }
    }

    private var entryIDDescription: String {
        switch entry.id {
        case .item(let index): return "item \(index)"
        case .folder(let path): return "folder \(path.description)"
        }
    }
}

// MARK: - Multiple selection

private struct SelectionInspectorView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.m) {
            QZCard(padding: QZTheme.Space.s + 2) {
                HStack(spacing: QZTheme.Space.s) {
                    QZIconTile(symbol: "square.stack.3d.up.fill",
                               tint: QZTheme.Palette.accent, size: 36)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(model.selection.count) entries")
                            .font(QZTheme.Typography.headline)
                        Text(EntryFormat.bytes(model.selectedBytes))
                            .font(QZTheme.Typography.metric)
                            .foregroundStyle(QZTheme.Palette.secondary)
                    }
                    Spacer()
                }
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
            ], spacing: QZTheme.Space.xs) {
                QZMiniStat(label: "Selected", value: "\(model.selection.count)", tint: QZTheme.Palette.accent)
                QZMiniStat(label: "Total Size", value: EntryFormat.bytes(model.selectedBytes), tint: QZTheme.Palette.info)
                QZMiniStat(label: "Encrypted", value: "\(model.selectedEncryptedCount)", tint: QZTheme.Palette.warning)
                QZMiniStat(label: "Folders", value: "\(model.selectedEntries.lazy.filter { $0.kind == .folder }.count)", tint: QZTheme.Palette.category(.folder))
            }

            QZCard(padding: QZTheme.Space.s + 2) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                    QZSectionLabel(title: "Selection")
                    ForEach(Array(model.selectedEntries.prefix(8))) { entry in
                        HStack(spacing: QZTheme.Space.xs) {
                            Image(systemName: EntryCategory.of(entry).symbolName)
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(QZTheme.Palette.category(EntryCategory.of(entry)))
                                .frame(width: 12)
                            Text(entry.name)
                                .font(QZTheme.Typography.caption)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Spacer(minLength: 2)
                            Text(EntryFormat.bytes(entry.size))
                                .font(QZTheme.Typography.micro)
                                .monospacedDigit()
                                .foregroundStyle(QZTheme.Palette.tertiary)
                        }
                    }
                    if model.selection.count > 8 {
                        Text("and \(model.selection.count - 8) more")
                            .font(QZTheme.Typography.micro)
                            .foregroundStyle(QZTheme.Palette.tertiary)
                    }
                }
            }

            Button {
                model.copySelectedPaths()
            } label: {
                Label("Copy Paths", systemImage: "doc.on.doc")
            }
            .buttonStyle(QZSecondaryButtonStyle())
        }
    }
}

// MARK: - Archive overview

private struct ArchiveInspectorView: View {
    @Environment(AppModel.self) private var model
    let snapshot: ArchiveSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.m) {
            QZCard(padding: QZTheme.Space.s + 2) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                    HStack(spacing: QZTheme.Space.xs) {
                        QZIconTile(symbol: "archivebox.fill",
                                   tint: QZTheme.Palette.category(.archive),
                                   size: 30)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(snapshot.displayName)
                                .font(QZTheme.Typography.bodyStrong)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            QZBadge(text: (snapshot.formatName ?? "archive").uppercased(),
                                    tint: QZFormatStyle.color(for: snapshot.formatName))
                        }
                        Spacer()
                    }
                    Divider()
                    QZInspectorField(label: "Archive Size",
                                     value: EntryFormat.bytes(snapshot.archiveSize),
                                     tint: QZTheme.Palette.category(.archive))
                    QZInspectorField(label: "Path", value: snapshot.url.path(percentEncoded: false),
                                     monospaced: true)
                    Button {
                        model.copyArchivePath()
                    } label: {
                        Label("Copy Archive Path", systemImage: "doc.on.doc")
                    }
                    .buttonStyle(QZSecondaryButtonStyle())
                }
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
                GridItem(.flexible(), spacing: QZTheme.Space.xs),
            ], spacing: QZTheme.Space.xs) {
                QZMiniStat(label: "Files", value: "\(snapshot.fileCount)", tint: QZTheme.Palette.category(.document))
                QZMiniStat(label: "Folders", value: "\(snapshot.folderCount)", tint: QZTheme.Palette.category(.folder))
                QZMiniStat(label: "Size", value: EntryFormat.bytes(snapshot.totalUncompressedSize), tint: QZTheme.Palette.info)
                QZMiniStat(label: "Packed", value: EntryFormat.bytes(snapshot.totalPackedSize), tint: QZTheme.Palette.category(.archive))
                QZMiniStat(label: "Ratio", value: EntryFormat.ratio(snapshot.compressionRatio), tint: QZTheme.Palette.ratio(snapshot.compressionRatio ?? 1))
                QZMiniStat(label: "Encrypted", value: "\(snapshot.encryptedCount)", tint: QZTheme.Palette.warning)
            }

            QZCard(padding: QZTheme.Space.s + 2) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                    QZSectionLabel(title: "Composition", trailing: "\(snapshot.categoryStats.count) kinds")
                    QZCompositionBar(stats: snapshot.categoryStats, height: 9)
                    ForEach(snapshot.categoryStats) { stat in
                        compositionRow(stat)
                    }
                }
            }

            QZCard(padding: QZTheme.Space.s + 2) {
                VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                    QZSectionLabel(title: "Largest Entries")
                    ForEach(snapshot.largestEntries(limit: 5)) { entry in
                        HStack(spacing: QZTheme.Space.xs) {
                            Image(systemName: EntryCategory.of(entry).symbolName)
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(QZTheme.Palette.category(EntryCategory.of(entry)))
                                .frame(width: 12)
                            Text(entry.name)
                                .font(QZTheme.Typography.caption)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Spacer(minLength: 2)
                            Text(EntryFormat.bytes(entry.size))
                                .font(QZTheme.Typography.micro)
                                .monospacedDigit()
                                .foregroundStyle(QZTheme.Palette.tertiary)
                        }
                    }
                }
            }

            if !methods.isEmpty {
                QZCard(padding: QZTheme.Space.s + 2) {
                    VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
                        QZSectionLabel(title: "Methods")
                        ForEach(methods) { item in
                            HStack {
                                QZBadge(text: item.name, tint: QZMethodStyle.color(for: item.name))
                                Spacer()
                                Text("\(item.count)")
                                    .font(QZTheme.Typography.micro)
                                    .monospacedDigit()
                                    .foregroundStyle(QZTheme.Palette.tertiary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func compositionRow(_ stat: CategoryStat) -> some View {
        HStack(spacing: QZTheme.Space.xs) {
            Circle()
                .fill(QZTheme.Palette.category(stat.category))
                .frame(width: 7, height: 7)
            Text(stat.category.displayName)
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.secondary)
            Spacer()
            Text("\(stat.count)")
                .font(QZTheme.Typography.micro)
                .monospacedDigit()
                .foregroundStyle(QZTheme.Palette.tertiary)
            Text(stat.bytes == 0 ? "—" : EntryFormat.bytes(stat.bytes))
                .font(QZTheme.Typography.micro)
                .monospacedDigit()
                .foregroundStyle(QZTheme.Palette.tertiary)
                .frame(width: 58, alignment: .trailing)
        }
    }

    private var methods: [MethodCount] {
        var counts: [String: Int] = [:]
        for entry in snapshot.entries {
            guard let method = entry.method, !method.isEmpty else { continue }
            counts[method, default: 0] += 1
        }
        return counts
            .sorted { $0.value > $1.value }
            .prefix(5)
            .map { MethodCount(name: $0.key, count: $0.value) }
    }
}

private struct MethodCount: Identifiable {
    let name: String
    let count: Int
    var id: String { name }
}

// MARK: - Small parts

private struct QZMiniStat: View {
    let label: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .foregroundStyle(QZTheme.Palette.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            Text(label.uppercased())
                .font(QZTheme.Typography.section)
                .tracking(0.4)
                .foregroundStyle(QZTheme.Palette.tertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, QZTheme.Space.s)
        .padding(.vertical, QZTheme.Space.xs + 1)
        .background(QZTheme.Palette.soft(tint),
                    in: RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
                .strokeBorder(QZTheme.Palette.outline(tint), lineWidth: 0.5)
        }
    }
}
