import SwiftUI
import QuarkZipKit

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var handledLaunchArgument = false

    var body: some View {
        @Bindable var model = model
        NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(
                    min: QZTheme.Size.sidebar,
                    ideal: QZTheme.Size.sidebar,
                    max: QZTheme.Size.inspector
                )
        } detail: {
            VStack(spacing: 0) {
                if let error = model.error {
                    QZErrorBanner(error: error) { model.dismissError() }
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                Group {
                    if model.hasArchive {
                        BrowserView()
                    } else {
                        WelcomeView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                QZStatusBar(text: model.statusText,
                            selectionCount: model.selection.count,
                            isLoading: model.isLoading)
            }
            .background(QZTheme.Palette.background)
            .animation(QZTheme.Motion.standard, value: model.error)
        }
        .navigationTitle(model.title)
        .navigationSubtitle(model.snapshot?.formatName ?? "")
        .toolbar { toolbar }
        .frame(minWidth: QZTheme.Size.minWindowWidth,
               minHeight: QZTheme.Size.minWindowHeight)
        .onAppear {
            guard !handledLaunchArgument else { return }
            handledLaunchArgument = true
            model.openLaunchArgumentIfNeeded()
        }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        @Bindable var model = model
        ToolbarItemGroup(placement: .navigation) {
            Button {
                model.goUp()
            } label: {
                Label("Parent Folder", systemImage: "chevron.left")
            }
            .disabled(!model.hasArchive || model.currentFolder.isRoot)
            .help("Go to the parent folder (⌘↑)")

            Button {
                model.chooseArchive()
            } label: {
                Label("Open", systemImage: "folder")
            }
            .help("Open an archive (⌘O)")
        }

        ToolbarItemGroup(placement: .primaryAction) {
            if model.hasArchive {
                TextField("Search", text: $model.searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 180)
                    .help("Filter this folder")

                Button {
                    // Extraction lands in milestone 2.
                } label: {
                    Label("Extract", systemImage: "arrow.up.doc")
                }
                .disabled(true)
                .help("Extract the selection (⌘⇧E)")

                Button {
                    model.revealInFinder()
                } label: {
                    Label("Reveal", systemImage: "folder.badge.magnifyingglass")
                }
                .help("Reveal the archive in Finder")
            }
        }
    }
}
