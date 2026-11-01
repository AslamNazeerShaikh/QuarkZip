import AppKit
import QuarkZipKit
import SwiftUI

struct SidebarView: View {
    @Environment(AppModel.self) private var model

    private let rowInsets = EdgeInsets(top: 1, leading: 6, bottom: 1, trailing: 6)

    var body: some View {
        List {
            Section {
                QZSidebarRow(
                    symbol: "square.and.arrow.down",
                    title: "Open Archive…",
                    tint: QZTheme.Palette.accent
                ) {
                    model.chooseArchive()
                }
                .listRowInsets(rowInsets)
            }

            if model.hasArchive {
                Section {
                    filterRow(.all, symbol: "tray.full",
                              title: "All Entries", tint: QZTheme.Palette.accent)
                    if (model.filterCounts[.folders] ?? 0) > 0 {
                        filterRow(.folders, symbol: "folder",
                                  title: "Folders", tint: QZTheme.Palette.accent)
                    }
                    if (model.filterCounts[.encrypted] ?? 0) > 0 {
                        filterRow(.encrypted, symbol: "lock.fill",
                                  title: "Encrypted", tint: QZTheme.Palette.warning)
                    }
                    if (model.filterCounts[.large] ?? 0) > 0 {
                        filterRow(.large, symbol: "internaldrive",
                                  title: "Large Items", tint: QZTheme.Palette.accent)
                    }
                } header: {
                    sidebarHeader("Filters")
                }

                Section {
                    ForEach(visibleCategories, id: \.self) { category in
                        QZSidebarRow(
                            symbol: category.outlineSymbolName,
                            title: category.displayName,
                            tint: QZTheme.Palette.accent,
                            dot: QZTheme.Palette.category(category),
                            count: model.filterCounts[.category(category)],
                            isSelected: model.filter == .category(category)
                        ) {
                            model.filter = .category(category)
                        }
                        .listRowInsets(rowInsets)
                    }
                } header: {
                    sidebarHeader("Categories")
                }
            }

            Section {
                if model.recents.isEmpty {
                    Text("Archives you open appear here")
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.textFaint)
                        .padding(.leading, QZTheme.Space.xs)
                } else {
                    ForEach(model.recents.prefix(6), id: \.self) { url in
                        QZSidebarRow(
                            symbol: "archivebox",
                            title: url.lastPathComponent,
                            tint: QZTheme.Palette.accent,
                            dot: QZFormatStyle.color(for: url.pathExtension)
                        ) {
                            model.open(url)
                        }
                        .help(url.path(percentEncoded: false))
                        .listRowInsets(rowInsets)
                    }
                }
            } header: {
                sidebarHeader("Recent")
            }

            Section {
                location("Home", symbol: "house", url: .homeDirectory, tint: QZTheme.Palette.accent)
                location("Desktop", symbol: "menubar.dock.rectangle", url: .desktopDirectory, tint: QZTheme.Palette.accent)
                location("Downloads", symbol: "arrow.down.circle", url: .downloadsDirectory, tint: QZTheme.Palette.accent)
            } header: {
                sidebarHeader("Locations")
            }
        }
        .listStyle(.sidebar)
    }

    private func sidebarHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(QZTheme.Typography.section)
            .tracking(0.6)
            .foregroundStyle(QZTheme.Palette.textFaint)
    }

    private var visibleCategories: [EntryCategory] {
        EntryCategory.allCases.filter { (model.filterCounts[.category($0)] ?? 0) > 0 }
    }

    private func filterRow(_ filter: EntryFilter,
                           symbol: String,
                           title: String,
                           tint: Color) -> some View {
        QZSidebarRow(
            symbol: symbol,
            title: title,
            tint: tint,
            count: model.filterCounts[filter],
            isSelected: model.filter == filter
        ) {
            model.filter = filter
        }
        .listRowInsets(rowInsets)
    }

    private func location(_ title: String,
                          symbol: String,
                          url: URL,
                          tint: Color) -> some View {
        QZSidebarRow(symbol: symbol, title: title, tint: tint) {
            model.openPanel(in: url)
        }
        .help("Choose an archive in \(title)")
        .listRowInsets(rowInsets)
    }
}
