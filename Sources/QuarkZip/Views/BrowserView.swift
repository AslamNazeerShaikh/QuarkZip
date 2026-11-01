import AppKit
import QuarkZipKit
import SwiftUI

struct BrowserView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            if let snapshot = model.snapshot {
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

            ZStack {
                Table(model.displayed, selection: $model.selection) {
                    TableColumn("Name") { entry in
                        nameCell(entry)
                    }
                    .width(min: 220, ideal: 340)

                    TableColumn("Size") { entry in
                        Text(entry.kind == .folder ? "—" : EntryFormat.bytes(entry.size))
                            .font(QZTheme.Typography.metric)
                            .foregroundStyle(QZTheme.Palette.secondary)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .width(min: 72, ideal: 92)

                    TableColumn("Packed") { entry in
                        Text(EntryFormat.packed(entry.packedSize))
                            .font(QZTheme.Typography.metric)
                            .foregroundStyle(QZTheme.Palette.secondary)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .width(min: 72, ideal: 92)

                    TableColumn("Ratio") { entry in
                        Text(EntryFormat.ratio(entry.compressionRatio))
                            .font(QZTheme.Typography.metric)
                            .foregroundStyle(QZTheme.Palette.tertiary)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .width(min: 52, ideal: 62)

                    TableColumn("Modified") { entry in
                        Text(EntryFormat.date(entry.modified))
                            .font(QZTheme.Typography.callout)
                            .foregroundStyle(QZTheme.Palette.secondary)
                    }
                    .width(min: 110, ideal: 140)

                    TableColumn("Method") { entry in
                        if let method = entry.method {
                            QZTag(text: method)
                        } else {
                            Text("—")
                                .font(QZTheme.Typography.callout)
                                .foregroundStyle(QZTheme.Palette.tertiary)
                        }
                    }
                    .width(min: 70, ideal: 100)
                }
                .tableStyle(.inset)
                .environment(\.defaultMinListRowHeight, QZTheme.Size.row)
                .onKeyPress(.return) {
                    openSelection()
                }

                if model.displayed.isEmpty && !model.isLoading {
                    ContentUnavailableView(
                        model.searchText.isEmpty ? "Empty Folder" : "No Matches",
                        systemImage: model.searchText.isEmpty ? "folder" : "magnifyingglass",
                        description: Text(model.searchText.isEmpty
                                          ? "This folder has no entries."
                                          : "Nothing in this folder matches “\(model.searchText)”.")
                    )
                    .background(QZTheme.Palette.background.opacity(0.92))
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

    private func nameCell(_ entry: ArchiveEntry) -> some View {
        HStack(spacing: QZTheme.Space.s) {
            Image(systemName: symbol(for: entry))
                .foregroundStyle(entry.kind == .folder
                                 ? QZTheme.Palette.accent
                                 : QZTheme.Palette.secondary)
                .frame(width: 16)
                .accessibilityHidden(true)
            Text(entry.name)
                .lineLimit(1)
                .truncationMode(.middle)
            if entry.isEncrypted {
                Image(systemName: "lock.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(QZTheme.Palette.warning)
                    .help("Encrypted entry")
            }
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
            Button("Show Info") { model.selection = [entry.id] }
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

    private func symbol(for entry: ArchiveEntry) -> String {
        guard entry.kind == .file else { return "folder.fill" }
        switch entry.path.name.lowercased() {
        case let name where name.hasSuffix(".png") || name.hasSuffix(".jpg")
            || name.hasSuffix(".jpeg") || name.hasSuffix(".gif")
            || name.hasSuffix(".heic") || name.hasSuffix(".tiff"):
            return "photo"
        case let name where name.hasSuffix(".pdf"):
            return "doc.richtext"
        case let name where name.hasSuffix(".txt") || name.hasSuffix(".md")
            || name.hasSuffix(".json") || name.hasSuffix(".xml")
            || name.hasSuffix(".csv"):
            return "doc.text"
        case let name where name.hasSuffix(".swift") || name.hasSuffix(".c")
            || name.hasSuffix(".cpp") || name.hasSuffix(".h")
            || name.hasSuffix(".js") || name.hasSuffix(".ts")
            || name.hasSuffix(".py") || name.hasSuffix(".rs"):
            return "chevron.left.forwardslash.chevron.right"
        case let name where name.hasSuffix(".zip") || name.hasSuffix(".7z")
            || name.hasSuffix(".tar") || name.hasSuffix(".gz")
            || name.hasSuffix(".xz") || name.hasSuffix(".bz2")
            || name.hasSuffix(".rar"):
            return "doc.zipper"
        default:
            return "doc"
        }
    }
}
