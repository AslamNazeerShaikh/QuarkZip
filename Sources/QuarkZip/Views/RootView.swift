import Combine
import SwiftUI
import QuarkZipKit

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("appearance") private var appearance: QZAppearance = .system
    @State private var handledLaunchArgument = false

    var body: some View {
        NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(
                    min: QZTheme.Size.paneMin,
                    ideal: QZTheme.Size.pane,
                    max: QZTheme.Size.paneMax
                )
        } detail: {
            detailColumn
        }
        .navigationSplitViewStyle(.balanced)
        .navigationTitle(model.title)
        .navigationSubtitle(model.snapshot?.formatName ?? "")
        .toolbar { toolbar }
        .frame(minWidth: QZTheme.Size.minWindowWidth,
               minHeight: QZTheme.Size.minWindowHeight)
        .preferredColorScheme(preferredScheme)
        .background {
            WindowSizing(
                minSize: CGSize(width: QZTheme.Size.minWindowWidth,
                                height: QZTheme.Size.minWindowHeight),
                maxSize: CGSize(width: QZTheme.Size.maxWindowWidth,
                                height: QZTheme.Size.maxWindowHeight),
                defaultSize: CGSize(width: QZTheme.Size.defaultWindowWidth,
                                    height: QZTheme.Size.defaultWindowHeight)
            )
            .frame(width: 0, height: 0)
            .accessibilityHidden(true)
        }
        .onAppear {
            handledLaunchArgument = true
            model.openLaunchArgumentIfNeeded()
        }
        .sheet(isPresented: aboutBinding) {
            QZAboutView()
        }
        .onOpenURL { url in
            model.open(url)
        }
        .onReceive(NotificationCenter.default.publisher(for: .quarkZipOpenArchive)) { note in
            guard let url = note.object as? URL else { return }
            model.open(url)
        }
    }

    private var detailColumn: some View {
        VStack(spacing: 0) {
            if let error = model.error {
                QZErrorBanner(error: error) { model.dismissError() }
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
        .animation(baseAnimation, value: model.error)
        .inspector(isPresented: inspectorBinding) {
            InspectorView()
                .inspectorColumnWidth(
                    min: QZTheme.Size.paneMin,
                    ideal: QZTheme.Size.pane,
                    max: QZTheme.Size.paneMax
                )
                .background(.bar)
        }
    }

    private var inspectorBinding: Binding<Bool> {
        Binding(get: { model.showInspector && model.hasArchive },
                set: { model.showInspector = $0 })
    }

    private var aboutBinding: Binding<Bool> {
        Binding(get: { model.showAbout }, set: { model.showAbout = $0 })
    }

    private var preferredScheme: ColorScheme? {
        switch appearance {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    private var baseAnimation: Animation {
        QZMotion.animation(QZTheme.Motion.standard, reduceMotion: reduceMotion)
    }

    private var gentleAnimation: Animation {
        QZMotion.animation(QZTheme.Motion.gentle, reduceMotion: reduceMotion)
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
            Button {
                model.showAbout = true
            } label: {
                Label("About QuarkZip", systemImage: "info.circle")
            }
            .help("About QuarkZip")

            if model.hasArchive {
                Button {
                    withAnimation(gentleAnimation) {
                        model.showInspector.toggle()
                    }
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
