import AppKit
import QuarkZipKit
import SwiftUI

struct BrowserView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("density") private var density: QZDensity = .compact

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            ArchiveHeaderView()

            if let snapshot = model.snapshot, !model.currentFolder.isRoot {
                QZBreadcrumb(
                    archiveName: snapshot.displayName,
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
                Table(model.displayed, selection: $model.selection) {
                    TableColumn("Name") { entry in
                        nameCell(entry)
                    }
                    .width(min: 180, ideal: 270)

                    TableColumn("Type") { entry in
                        typeCell(entry)
                    }
                    .width(min: 72, ideal: 84)

                    TableColumn("Size") { entry in
                        metric(entry.kind == .folder ? "—" : EntryFormat.bytes(entry.size))
                    }
                    .width(min: 58, ideal: 70)

                    TableColumn("Packed") { entry in
                        metric(metricsVisible
                               ? EntryFormat.packed(entry.packedSize)
                               : "—")
                    }
                    .width(min: 58, ideal: 70)

                    TableColumn("Ratio") { entry in
                        ratioCell(entry)
                    }
                    .width(min: 56, ideal: 64)

                    TableColumn("Modified") { entry in
                        Text(EntryFormat.shortDate(entry.modified))
                            .font(QZTheme.Typography.caption)
                            .foregroundStyle(QZTheme.Palette.secondary)
                    }
                    .width(min: 76, ideal: 96)

                    TableColumn("Method") { entry in
                        methodCell(entry)
                    }
                    .width(min: 70, ideal: 84)

                    TableColumn("") { entry in
                        if entry.isEncrypted {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(QZTheme.Palette.warning)
                                .help("Encrypted entry")
                        }
                    }
                    .width(min: 18, ideal: 20)
                }
                .tableStyle(InsetTableStyle(alternatesRowBackgrounds: false))
                .environment(\.defaultMinListRowHeight, density.rowHeight)
                .onKeyPress(.return) {
                    openSelection()
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
        .inspector(isPresented: $model.showInspector) {
            InspectorView()
                .inspectorColumnWidth(min: 280, ideal: QZTheme.Size.inspector, max: 380)
        }
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

    private func nameCell(_ entry: ArchiveEntry) -> some View {
        let category = EntryCategory.of(entry)
        return HStack(spacing: QZTheme.Space.xs + 2) {
            Image(systemName: category.symbolName)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(QZTheme.Palette.category(category))
                .frame(width: 14)
            Text(entry.name)
                .font(QZTheme.Typography.body)
                .lineLimit(1)
                .truncationMode(.middle)
            Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
        .help(entry.path.description)
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
    }

    private func typeCell(_ entry: ArchiveEntry) -> some View {
        let category = EntryCategory.of(entry)
        return HStack(spacing: QZTheme.Space.xs) {
            Circle()
                .fill(QZTheme.Palette.category(category))
                .frame(width: 6, height: 6)
            Text(category.displayName)
                .font(QZTheme.Typography.badge)
                .foregroundStyle(QZTheme.Palette.secondary)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
    }

    private func metric(_ text: String) -> some View {
        Text(text)
            .font(QZTheme.Typography.metric)
            .foregroundStyle(QZTheme.Palette.secondary)
            .frame(maxWidth: .infinity, alignment: .trailing)
    }

    private func ratioCell(_ entry: ArchiveEntry) -> some View {
        let ratio = metricsVisible ? entry.compressionRatio : nil
        return VStack(alignment: .trailing, spacing: 2) {
            Text(EntryFormat.ratio(ratio))
                .font(QZTheme.Typography.microMono)
                .foregroundStyle(ratio == nil ? QZTheme.Palette.tertiary : QZTheme.Palette.secondary)
            QZRatioBar(value: ratio, height: 2)
                .frame(width: 38)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .accessibilityLabel("Compression ratio \(EntryFormat.ratio(ratio))")
    }

    private func methodCell(_ entry: ArchiveEntry) -> some View {
        Group {
            if let method = entry.method, !method.isEmpty {
                QZBadge(text: method,
                        tint: QZMethodStyle.color(for: method),
                        monospaced: true)
            } else {
                Text("—")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.tertiary)
            }
        }
    }

    private func openSelection() -> KeyPress.Result {
        guard let id = model.selection.first,
              let entry = model.displayed.first(where: { $0.id == id }) else {
            return .ignored
        }
        model.enter(entry)
        return .handled
    }
}
