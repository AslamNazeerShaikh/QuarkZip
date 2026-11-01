import SwiftUI

@main
struct QuarkZipApp: App {
    @State private var model = AppModel()
    @AppStorage("appearance") private var appearance: AppearanceMode = .system

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .preferredColorScheme(appearance.colorScheme)
        }
        .defaultSize(width: 1180, height: 720)
        .windowToolbarStyle(.unified)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Open Archive…") {
                    model.chooseArchive()
                }
                .keyboardShortcut("o", modifiers: .command)

                Button("Close Archive") {
                    model.closeArchive()
                }
                .keyboardShortcut("w", modifiers: [.command, .shift])
                .disabled(!model.hasArchive)
            }

            CommandMenu("Archive") {
                Button("Go to Parent Folder") {
                    model.goUp()
                }
                .keyboardShortcut(.upArrow, modifiers: .command)
                .disabled(!model.hasArchive || model.currentFolder.isRoot)

                Divider()

                Button("Extract Selection…") {
                    // Milestone 2.
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])
                .disabled(true)

                Button("Test Archive…") {
                    // Milestone 3.
                }
                .keyboardShortcut("t", modifiers: [.command, .shift])
                .disabled(true)

                Divider()

                Button("Reveal in Finder") {
                    model.revealInFinder()
                }
                .disabled(!model.hasArchive)
            }
        }

        Settings {
            SettingsView()
        }
    }
}
