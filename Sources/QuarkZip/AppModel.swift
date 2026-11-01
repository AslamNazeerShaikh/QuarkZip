import AppKit
import Observation
import QuarkZipKit
import SwiftUI

/// The single source of truth for the main window.
///
/// Views read it and call intents. All archive work goes through
/// `ArchiveService`, so the UI never talks to the engine directly.
@MainActor
@Observable
final class AppModel {
    private(set) var snapshot: ArchiveSnapshot?
    private(set) var displayed: [ArchiveEntry] = []
    private(set) var isLoading = false
    private(set) var recents: [URL] = []
    private(set) var error: ArchiveError?

    var currentFolder: ArchivePath = .root {
        didSet { rebuildDisplayed() }
    }

    var searchText: String = "" {
        didSet { rebuildDisplayed() }
    }

    var sort = EntrySort() {
        didSet { rebuildDisplayed() }
    }

    var selection: Set<EntryID> = [] {
        didSet {
            if !selection.isEmpty {
                error = nil
            }
        }
    }

    private let service: any ArchiveService

    init(service: any ArchiveService = SevenZipArchiveService()) {
        self.service = service
    }

    var hasArchive: Bool { snapshot != nil }

    var title: String { snapshot?.displayName ?? "QuarkZip" }

    var statusText: String {
        guard let snapshot else { return "No archive open" }
        let files = snapshot.fileCount
        let folders = snapshot.folderCount
        let size = EntryFormat.bytes(snapshot.totalUncompressedSize)
        return "\(files) files, \(folders) folders  ·  \(size)"
    }

    var breadcrumbs: [ArchivePath] {
        guard !currentFolder.isRoot else { return [] }
        var result: [ArchivePath] = []
        var path = currentFolder
        while !path.isRoot {
            result.append(path)
            path = path.parent
        }
        return result.reversed()
    }

    var selectedEntries: [ArchiveEntry] {
        guard let snapshot else { return [] }
        let lookup = Dictionary(uniqueKeysWithValues: snapshot.entries.map { ($0.id, $0) })
        return selection.compactMap { lookup[$0] }
    }

    // MARK: - Intents

    func chooseArchive() {
        openPanel(in: nil)
    }

    func openPanel(in directory: URL?) {
        let panel = NSOpenPanel()
        panel.title = "Open an Archive"
        panel.prompt = "Open"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.resolvesAliases = true
        if let directory {
            panel.directoryURL = directory
        }
        guard panel.runModal() == .OK, let url = panel.url else { return }
        open(url)
    }

    func dismissError() {
        error = nil
    }

    /// Used by snapshot mode and previews to show a known archive without I/O.
    func applySnapshot(_ snapshot: ArchiveSnapshot) {
        self.snapshot = snapshot
        currentFolder = .root
        selection = []
        searchText = ""
        rebuildDisplayed()
    }

    /// Opens a file passed after `--open` on the command line.
    func openLaunchArgumentIfNeeded() {
        let arguments = ProcessInfo.processInfo.arguments
        guard let flag = arguments.firstIndex(of: "--open"),
              arguments.index(after: flag) < arguments.endIndex else { return }
        let path = arguments[arguments.index(after: flag)]
        open(URL(fileURLWithPath: path))
    }

    func open(_ url: URL) {
        isLoading = true
        error = nil
        Task {
            do {
                let opened = try await service.open(url: url, password: nil)
                snapshot = opened
                currentFolder = .root
                selection = []
                searchText = ""
                remember(url)
                rebuildDisplayed()
            } catch let archiveError as ArchiveError {
                error = archiveError
            } catch {
                self.error = ArchiveError(code: .internalError,
                                          detail: error.localizedDescription)
            }
            isLoading = false
        }
    }

    func closeArchive() {
        snapshot = nil
        displayed = []
        selection = []
        searchText = ""
        currentFolder = .root
        error = nil
    }

    func enter(_ entry: ArchiveEntry) {
        guard entry.kind == .folder else { return }
        currentFolder = entry.path
        selection = []
    }

    func goUp() {
        guard !currentFolder.isRoot else { return }
        currentFolder = currentFolder.parent
        selection = []
    }

    func revealInFinder() {
        guard let url = snapshot?.url else { return }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    // MARK: - Private

    private func remember(_ url: URL) {
        recents.removeAll { $0 == url }
        recents.insert(url, at: 0)
        if recents.count > 8 { recents.removeLast(recents.count - 8) }
    }

    private func rebuildDisplayed() {
        guard let snapshot else {
            displayed = []
            return
        }
        var list = snapshot.tree.children(of: currentFolder)
        if !searchText.isEmpty {
            list = list.filter {
                $0.path.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        displayed = sort.sorted(list)
        let valid = Set(displayed.map(\.id))
        selection.formIntersection(valid)
    }
}
