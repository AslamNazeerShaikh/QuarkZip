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

    var filter: EntryFilter = .all {
        didSet { rebuildDisplayed() }
    }

    var showInspector = true

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

    private(set) var baseEntries: [ArchiveEntry] = []
    private(set) var filterCounts: [EntryFilter: Int] = [:]
    private var entriesByID: [EntryID: ArchiveEntry] = [:]

    private let service: any ArchiveService

    init(service: any ArchiveService = SevenZipArchiveService()) {
        self.service = service
    }

    var hasArchive: Bool { snapshot != nil }

    var title: String { snapshot?.displayName ?? "Workspace" }

    var statusText: String {
        guard snapshot != nil else { return "No archive open" }
        let files = displayed.lazy.filter { $0.kind == .file }.count
        let folders = displayed.lazy.filter { $0.kind == .folder }.count
        let bytes = displayed.reduce(UInt64(0)) { $0 &+ $1.size }
        var parts: [String] = []
        parts.append(displayed.count == baseEntries.count
                     ? "\(displayed.count) entries"
                     : "\(displayed.count) of \(baseEntries.count) entries")
        if files > 0 { parts.append("\(files) files") }
        if folders > 0 { parts.append("\(folders) folders") }
        parts.append(EntryFormat.bytes(bytes))
        return parts.joined(separator: "  ·  ")
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
        selection.compactMap { entriesByID[$0] }
    }

    var selectedEntry: ArchiveEntry? {
        selection.count == 1 ? selectedEntries.first : nil
    }

    var selectedBytes: UInt64 {
        selectedEntries.reduce(0) { $0 &+ $1.size }
    }

    var selectedEncryptedCount: Int {
        selectedEntries.lazy.filter(\.isEncrypted).count
    }

    var filterSummary: String? {
        filter == .all ? nil : filter.title
    }

    var archivePath: String {
        snapshot?.url.deletingLastPathComponent().path(percentEncoded: false) ?? ""
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

    func clearFilters() {
        filter = .all
        searchText = ""
    }

    func selectAllDisplayed() {
        selection = Set(displayed.map(\.id))
    }

    func copySelectedPaths() {
        let text = selectedEntries.map(\.path.description).joined(separator: "\n")
        guard !text.isEmpty else { return }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    func copySelectedNames() {
        let text = selectedEntries.map(\.name).joined(separator: "\n")
        guard !text.isEmpty else { return }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }

    func copyArchivePath() {
        guard let snapshot else { return }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(snapshot.url.path(percentEncoded: false), forType: .string)
    }

    /// Used by snapshot mode to show a populated sidebar.
    func seedRecentsForSnapshot(_ urls: [URL]) {
        recents = urls
    }

    /// Used by snapshot mode and previews to show a known archive without I/O.
    func applySnapshot(_ snapshot: ArchiveSnapshot) {
        self.snapshot = snapshot
        entriesByID = Dictionary(uniqueKeysWithValues: snapshot.entries.map { ($0.id, $0) })
        currentFolder = .root
        selection = []
        searchText = ""
        filter = .all
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
                entriesByID = Dictionary(uniqueKeysWithValues: opened.entries.map { ($0.id, $0) })
                currentFolder = .root
                selection = []
                searchText = ""
                filter = .all
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
        entriesByID = [:]
        displayed = []
        baseEntries = []
        filterCounts = [:]
        selection = []
        searchText = ""
        filter = .all
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
            baseEntries = []
            filterCounts = [:]
            return
        }
        let base = snapshot.tree.children(of: currentFolder)
        baseEntries = base
        filterCounts = Self.makeFilterCounts(base)

        var list = base.filter { filter.matches($0) }
        if !searchText.isEmpty {
            list = list.filter {
                $0.path.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        displayed = sort.sorted(list)
        let valid = Set(displayed.map(\.id))
        selection.formIntersection(valid)
    }

    private static func makeFilterCounts(_ entries: [ArchiveEntry]) -> [EntryFilter: Int] {
        var counts: [EntryFilter: Int] = [.all: entries.count, .folders: 0, .encrypted: 0, .large: 0]
        for entry in entries {
            let category = EntryCategory.of(entry)
            counts[.category(category), default: 0] += 1
            if entry.kind == .folder { counts[.folders, default: 0] += 1 }
            if entry.isEncrypted { counts[.encrypted, default: 0] += 1 }
            if EntryFilter.large.matches(entry) { counts[.large, default: 0] += 1 }
        }
        return counts
    }
}
