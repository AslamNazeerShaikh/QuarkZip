import AppKit
import QuarkZipKit
import SwiftUI

@main
struct QuarkZipApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var model = AppModel()
    @AppStorage("appearance") private var appearance: AppearanceMode = .system

    init() {
        if let status = Self.runSelfTestIfRequested() {
            exit(status)
        }
    }

    /// `QuarkZip --selftest <archive>` runs the same service the UI calls,
    /// prints one PASS or FAIL per check, and exits 0 or 1.
    private static func runSelfTestIfRequested() -> Int32? {
        let arguments = CommandLine.arguments
        guard let flag = arguments.firstIndex(of: "--selftest") else { return nil }
        guard arguments.index(after: flag) < arguments.endIndex else {
            print("FAIL selftest needs an archive path")
            return 1
        }
        let path = arguments[arguments.index(after: flag)]
        var failures = 0
        func check(_ name: String, _ condition: @autoclosure () -> Bool) {
            if condition() {
                print("PASS \(name)")
            } else {
                print("FAIL \(name)")
                failures += 1
            }
        }

        check("engine version", SevenZipArchiveService.engineVersion == "7-Zip 26.05")

        do {
            let snapshot = try SevenZipArchiveService.openSynchronously(
                url: URL(fileURLWithPath: path), password: nil)
            check("archive opens", true)
            check("format detected", snapshot.formatName != nil)
            check("entries listed", !snapshot.entries.isEmpty)
            check("tree has children", !snapshot.tree.children(of: .root).isEmpty)
            check("hello.txt present", snapshot.entries.contains { $0.path.description == "hello.txt" })
            check("nested folder present", snapshot.tree.folders.contains { $0.description == "sub" })
            check("size formatted", !EntryFormat.bytes(5).isEmpty)
        } catch {
            check("archive opens", false)
            print("FAIL detail: \(error)")
        }

        print(failures == 0 ? "selftest: PASS" : "selftest: FAIL (\(failures))")
        return failures == 0 ? 0 : 1
    }

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

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        if SnapshotRunner.runIfRequested() {
            NSApp.terminate(nil)
        }
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            NotificationCenter.default.post(name: .quarkZipOpenArchive, object: url)
        }
    }
}

extension Notification.Name {
    static let quarkZipOpenArchive = Notification.Name("QuarkZipOpenArchive")
}
