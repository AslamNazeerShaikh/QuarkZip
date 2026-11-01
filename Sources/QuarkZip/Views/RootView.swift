import Combine
import SwiftUI
import QuarkZipKit

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var handledLaunchArgument = false

    var body: some View {
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
                            isLoading: model.isLoading,
                            filter: model.filterSummary,
                            engine: SevenZipArchiveService.engineVersion)
            }
            .background(QZTheme.Palette.background)
            .animation(QZMotion.animation(QZTheme.Motion.standard, reduceMotion: reduceMotion),
                       value: model.error)
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
        .onOpenURL { url in
            model.open(url)
        }
        .onReceive(NotificationCenter.default.publisher(for: .quarkZipOpenArchive)) { note in
            guard let url = note.object as? URL else { return }
            model.open(url)
        }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
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
                Button {
                    model.showInspector.toggle()
                } label: {
                    Label("Inspector", systemImage: "sidebar.right")
                }
                .help("Show or hide the inspector (⌥⌘I)")

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
