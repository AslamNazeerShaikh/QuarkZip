import AppKit
import QuarkZipKit
import SwiftUI

struct SidebarView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            Section("Library") {
                Button {
                    model.chooseArchive()
                } label: {
                    Label("Open Archive…", systemImage: "archivebox")
                }
                .buttonStyle(.plain)

                if model.recents.isEmpty {
                    Text("Recent archives appear here")
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.tertiary)
                        .padding(.leading, QZTheme.Space.xxl)
                } else {
                    ForEach(model.recents, id: \.self) { url in
                        Button {
                            model.open(url)
                        } label: {
                            Label {
                                Text(url.lastPathComponent)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            } icon: {
                                Image(systemName: "clock")
                            }
                        }
                        .buttonStyle(.plain)
                        .help(url.path(percentEncoded: false))
                    }
                }
            }

            Section("Locations") {
                location("Home", symbol: "house", url: .homeDirectory)
                location("Desktop", symbol: "menubar.dock.rectangle", url: .desktopDirectory)
                location("Downloads", symbol: "arrow.down.circle", url: .downloadsDirectory)
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(QZTheme.Palette.surface)
    }

    private func location(_ title: String, symbol: String, url: URL) -> some View {
        Button {
            model.openPanel(in: url)
        } label: {
            Label(title, systemImage: symbol)
        }
        .buttonStyle(.plain)
        .help("Choose an archive in \(title)")
    }
}
