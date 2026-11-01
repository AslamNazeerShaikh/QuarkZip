import AppKit
import QuarkZipKit
import SwiftUI

struct BrowserView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("density") private var density: QZDensity = .comfortable
    @AppStorage("showEmoji") private var showEmoji = false

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
                        ForEach(model.visibleEntries) { entry in
                            QZEntryRowView(
                                entry: entry,
                                isSelected: model.selection.contains(entry.id),
                                showEmoji: showEmoji,
                                metricsVisible: model.snapshot?.showsCompressionMetrics == true,
                                rowHeight: density.rowHeight,
                                actions: rowActions
                            )
                            .equatable()
                            .listRowInsets(EdgeInsets(
                                top: QZTheme.Space.xxs,
                                leading: QZTheme.Space.m,
                                bottom: QZTheme.Space.xxs,
                                trailing: QZTheme.Space.m))
                            .listRowSeparator(.hidden)
                            .listRowBackground(rowBackground(
                                isSelected: model.selection.contains(entry.id)))
                            .tag(entry.id)
                            .onAppear {
                                if entry.id == model.visibleEntries.last?.id {
                                    model.loadMoreVisible()
                                }
                            }
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

    private var rowActions: QZEntryRowActions {
        QZEntryRowActions(
            open: { model.enter($0) },
            select: { model.selection = [$0.id] },
            copyPath: {
                model.selection = [$0.id]
                model.copySelectedPaths()
            },
            copyName: {
                model.selection = [$0.id]
                model.copySelectedNames()
            }
        )
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
}
