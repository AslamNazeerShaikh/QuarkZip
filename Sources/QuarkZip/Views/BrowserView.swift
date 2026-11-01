import AppKit
import QuarkZipKit
import SwiftUI

struct BrowserView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("density") private var density: QZDensity = .compact
    @AppStorage("showEmoji") private var showEmoji = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            ArchiveHeaderView()

            if model.snapshot != nil, !model.currentFolder.isRoot {
                QZBreadcrumb(
                    archiveName: model.snapshot?.displayName ?? "",
                    segments: model.breadcrumbs,
                    onRoot: {
                        model.currentFolder = .root
                        model.selection = []
                    },
                    onSelect: { path in
                        model.currentFolder = path
                        model.selection = []
                    }
                )
            }

            FilterBarView()

            ZStack {
                VStack(spacing: 0) {
                    columnHeader
                    Divider()
                    List(selection: $model.selection) {
                        ForEach(model.displayed) { entry in
                            entryRow(entry)
                                .listRowInsets(EdgeInsets(
                                    top: QZTheme.Space.xxs,
                                    leading: QZTheme.Space.m,
                                    bottom: QZTheme.Space.xxs,
                                    trailing: QZTheme.Space.m))
                                .listRowSeparator(.hidden)
                                .listRowBackground(rowBackground(
                                    isSelected: model.selection.contains(entry.id)))
                                .tag(entry.id)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .background(QZTheme.Palette.background)
                    .environment(\.defaultMinListRowHeight, density.rowHeight)
                }

                if model.displayed.isEmpty && !model.isLoading {
                    emptyState
                }

                if model.isLoading {
                    ProgressView("Reading archive…")
                        .controlSize(.regular)
                        .padding(QZTheme.Space.xxl)
                        .background(.regularMaterial,
                                    in: RoundedRectangle(cornerRadius: QZTheme.Radius.panel))
                }
            }
        }
    }

    // MARK: - Header

    private var columnHeader: some View {
        HStack(spacing: QZTheme.Space.s) {
            Text("Name")
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Type").frame(width: 92, alignment: .leading)
            Text("Size").frame(width: 76, alignment: .trailing)
            Text("Packed").frame(width: 76, alignment: .trailing)
            Text("Ratio").frame(width: 72, alignment: .trailing)
            Text("Modified").frame(width: 96, alignment: .leading)
            Text("Method").frame(width: 88, alignment: .leading)
            Text("")
                .frame(width: 20, alignment: .center)
        }
        .font(QZTheme.Typography.section)
        .foregroundStyle(QZTheme.Palette.textFaint)
        .padding(.horizontal, QZTheme.Space.l)
        .frame(height: 28)
        .background(QZTheme.Palette.background)
    }

    // MARK: - Rows

    private func rowBackground(isSelected: Bool) -> some View {
        RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
            .fill(isSelected ? QZTheme.Palette.selection : Color.clear)
            .overlay {
                RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
                    .strokeBorder(isSelected ? QZTheme.Palette.selectionBorder : Color.clear,
                                  lineWidth: 1)
            }
            .padding(.vertical, 1)
    }

    private func entryRow(_ entry: ArchiveEntry) -> some View {
        let category = EntryCategory.of(entry)
        let isSelected = model.selection.contains(entry.id)
        return HStack(spacing: QZTheme.Space.s) {
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

            ratioCell(entry)
                .frame(width: 72, alignment: .trailing)

            Text(EntryFormat.shortDate(entry.modified))
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.textSecondary)
                .frame(width: 96, alignment: .leading)
                .lineLimit(1)

            methodCell(entry, isSelected: isSelected)
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
        .frame(height: density.rowHeight)
        .contentShape(Rectangle())
        .onTapGesture(count: 2) {
            model.enter(entry)
        }
        .contextMenu {
            if entry.kind == .folder {
                Button("Open Folder") { model.enter(entry) }
            }
            Button("Show in Inspector") { model.selection = [entry.id] }
            Divider()
            Button("Copy Path") {
                model.selection = [entry.id]
                model.copySelectedPaths()
            }
            Button("Copy Name") {
                model.selection = [entry.id]
                model.copySelectedNames()
            }
        }
        .help(entry.path.description)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(entry.name), \(category.displayName)")
    }

    private var metricsVisible: Bool {
        model.snapshot?.showsCompressionMetrics == true
    }

    private var emptyState: some View {
        ContentUnavailableView(
            emptyTitle,
            systemImage: emptySymbol,
            description: Text(emptyMessage)
        )
        .background(QZTheme.Palette.background.opacity(0.94))
    }

    private var emptyTitle: String {
        if !model.searchText.isEmpty { return "No Matches" }
        if model.filter != .all { return "Nothing in \(model.filter.title)" }
        return "Empty Folder"
    }

    private var emptySymbol: String {
        if !model.searchText.isEmpty { return "magnifyingglass" }
        if case .category(let category) = model.filter { return category.symbolName }
        return "folder"
    }

    private var emptyMessage: String {
        if !model.searchText.isEmpty {
            return "Nothing in this folder matches “\(model.searchText)”."
        }
        if model.filter != .all {
            return "This folder has no entries for the \(model.filter.title) filter."
        }
        return "This folder has no entries."
    }

    private func ratioCell(_ entry: ArchiveEntry) -> some View {
        let ratio = metricsVisible ? entry.compressionRatio : nil
        return VStack(alignment: .trailing, spacing: QZTheme.Space.xxs) {
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

    private func methodCell(_ entry: ArchiveEntry, isSelected: Bool) -> some View {
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
        .opacity(isSelected ? 1 : 1)
    }
}
