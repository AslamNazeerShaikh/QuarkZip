import AppKit
import QuarkZipKit
import SwiftUI

struct SidebarView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("showEmoji") private var showEmoji = false

    private let rowInsets = EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)

    var body: some View {
        List {
            Section {
                QZSidebarRow(
                    symbol: "square.and.arrow.down",
                    title: "Open Archive…",
                    tint: QZTheme.Palette.accent,
                    emoji: showEmoji ? "📂" : nil
                ) {
                    model.chooseArchive()
                }
                .listRowInsets(rowInsets)
            }

            if model.hasArchive {
                Section {
                    filterRow(.all, symbol: "tray.full",
                              title: "All Entries", tint: QZTheme.Palette.accent,
                              emoji: showEmoji ? "📚" : nil)
                    if (model.filterCounts[.folders] ?? 0) > 0 {
                        filterRow(.folders, symbol: "folder",
                                  title: "Folders", tint: QZTheme.Palette.accent,
                                  emoji: showEmoji ? "📁" : nil)
                    }
                    if (model.filterCounts[.encrypted] ?? 0) > 0 {
                        filterRow(.encrypted, symbol: "lock.fill",
                                  title: "Encrypted", tint: QZTheme.Palette.warning,
                                  emoji: showEmoji ? "🔒" : nil)
                    }
                    if (model.filterCounts[.large] ?? 0) > 0 {
                        filterRow(.large, symbol: "internaldrive",
                                  title: "Large Items", tint: QZTheme.Palette.accent,
                                  emoji: showEmoji ? "📦" : nil)
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
                            isSelected: model.filter == .category(category),
                            emoji: showEmoji ? category.emoji : nil
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
                        let category = EntryCategory.of(fileName: url.lastPathComponent)
                        QZSidebarRow(
                            symbol: "archivebox",
                            title: url.lastPathComponent,
                            tint: QZTheme.Palette.accent,
                            dot: QZFormatStyle.color(for: url.pathExtension),
                            emoji: showEmoji ? category.emoji : nil
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
                location("Home", symbol: "house", url: .homeDirectory,
                         tint: QZTheme.Palette.accent,
                         emoji: showEmoji ? "🏠" : nil)
                location("Desktop", symbol: "menubar.dock.rectangle", url: .desktopDirectory,
                         tint: QZTheme.Palette.accent,
                         emoji: showEmoji ? "🖥️" : nil)
                location("Downloads", symbol: "arrow.down.circle", url: .downloadsDirectory,
                         tint: QZTheme.Palette.accent,
                         emoji: showEmoji ? "⬇️" : nil)
            } header: {
                sidebarHeader("Locations")
            }

            Section {
                QZSidebarRow(
                    symbol: "info.circle",
                    title: "About QuarkZip",
                    tint: QZTheme.Palette.accent,
                    emoji: showEmoji ? "ℹ️" : nil
                ) {
                    model.showAbout = true
                }
                .listRowInsets(rowInsets)
            } header: {
                sidebarHeader("App")
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
    }

    private func sidebarHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(QZTheme.Typography.section)
            .foregroundStyle(QZTheme.Palette.textFaint)
    }

    private var visibleCategories: [EntryCategory] {
        EntryCategory.allCases.filter { (model.filterCounts[.category($0)] ?? 0) > 0 }
    }

    private func filterRow(_ filter: EntryFilter,
                           symbol: String,
                           title: String,
                           tint: Color,
                           emoji: String? = nil) -> some View {
        QZSidebarRow(
            symbol: symbol,
            title: title,
            tint: tint,
            count: model.filterCounts[filter],
            isSelected: model.filter == filter,
            emoji: emoji
        ) {
            model.filter = filter
        }
        .listRowInsets(rowInsets)
    }

    private func location(_ title: String,
                          symbol: String,
                          url: URL,
                          tint: Color,
                          emoji: String? = nil) -> some View {
        QZSidebarRow(symbol: symbol, title: title, tint: tint, emoji: emoji) {
            model.openPanel(in: url)
        }
        .help("Choose an archive in \(title)")
        .listRowInsets(rowInsets)
    }
}
