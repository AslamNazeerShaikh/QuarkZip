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
        didSet { scheduleRebuild() }
    }

    var searchText: String = "" {
        didSet { scheduleRebuild() }
    }

    var filter: EntryFilter = .all {
        didSet { scheduleRebuild() }
    }

    var showInspector = true
    var showAbout = false

    var sort = EntrySort() {
        didSet { scheduleRebuild() }
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

    /// Cached totals over `displayed`, so the status bar never scans 1M rows.
    private(set) var displayedFileCount = 0
    private(set) var displayedFolderCount = 0
    private(set) var displayedBytes: UInt64 = 0

    /// Archive-wide totals computed once per open, off the main actor.
    /// The header and inspector read these instead of scanning entries
    /// per frame, so expanding the inspector never hitches.
    private(set) var archiveFacts: ArchiveFacts = .empty

    /// Packed over unpacked, or nil when the container does not compress
    /// or the handler reported no packed sizes. Mirrors the guards in
    /// `ArchiveSnapshot.compressionRatio`.
    var archiveCompressionRatio: Double? {
        guard let snapshot, snapshot.showsCompressionMetrics,
              archiveFacts.totalSize > 0, snapshot.totalPackedSize > 0 else { return nil }
        return Double(snapshot.totalPackedSize) / Double(archiveFacts.totalSize)
    }

    /// The list renders a window of this many rows and grows it as the user
    /// scrolls, so a 1M-entry folder scrolls without diffing 1M views.
    static let pageSize = 500
    private(set) var visibleLimit = AppModel.pageSize

    var visibleEntries: [ArchiveEntry] {
        Array(displayed.prefix(visibleLimit))
    }

    var visibleCount: Int {
        min(visibleLimit, displayed.count)
    }

    var isWindowing: Bool {
        visibleLimit < displayed.count
    }

    func loadMoreVisible() {
        guard isWindowing else { return }
        visibleLimit += Self.pageSize
    }

    /// Monotonic id; only the newest rebuild may publish its result.
    private var generation = 0
    /// True while `open`/`applySnapshot` mutate several fields at once.
    private var suppressSchedule = false

    private let service: any ArchiveService

    init(service: any ArchiveService = SevenZipArchiveService()) {
        self.service = service
    }

    var hasArchive: Bool { snapshot != nil }

    var title: String { snapshot?.displayName ?? "Workspace" }

    var statusText: String {
        guard snapshot != nil else { return "No archive open" }
        var parts: [String] = []
        if isWindowing {
            parts.append("\(visibleCount) of \(displayed.count) entries")
        } else if displayed.count == baseEntries.count {
            parts.append("\(displayed.count) entries")
        } else {
            parts.append("\(displayed.count) of \(baseEntries.count) entries")
        }
        if displayedFileCount > 0 { parts.append("\(displayedFileCount) files") }
        if displayedFolderCount > 0 { parts.append("\(displayedFolderCount) folders") }
        parts.append(EntryFormat.bytes(displayedBytes))
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
        suppressSchedule = true
        defer { suppressSchedule = false }
        self.snapshot = snapshot
        entriesByID = Dictionary(uniqueKeysWithValues: snapshot.entries.map { ($0.id, $0) })
        archiveFacts = ArchiveFacts.make(from: snapshot.entries)
        currentFolder = .root
        selection = []
        searchText = ""
        filter = .all
        visibleLimit = Self.pageSize
        rebuildSynchronously()
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
                let index = await Task.detached(priority: .userInitiated) {
                    (byID: Dictionary(uniqueKeysWithValues: opened.entries.map { ($0.id, $0) }),
                     facts: ArchiveFacts.make(from: opened.entries))
                }.value
                suppressSchedule = true
                snapshot = opened
                entriesByID = index.byID
                archiveFacts = index.facts
                currentFolder = .root
                selection = []
                searchText = ""
                filter = .all
                visibleLimit = Self.pageSize
                suppressSchedule = false
                remember(url)
                await runRebuild(generation: nextGeneration())
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
        generation += 1
        suppressSchedule = true
        defer { suppressSchedule = false }
        snapshot = nil
        entriesByID = [:]
        archiveFacts = .empty
        displayed = []
        baseEntries = []
        filterCounts = [:]
        displayedFileCount = 0
        displayedFolderCount = 0
        displayedBytes = 0
        visibleLimit = Self.pageSize
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

    private func nextGeneration() -> Int {
        generation += 1
        return generation
    }

    /// Interactive edits (folder, search, filter, sort) never block the main
    /// actor: filtering and sorting run on a detached task and only the
    /// newest generation publishes.
    private func scheduleRebuild() {
        guard !suppressSchedule else { return }
        visibleLimit = Self.pageSize
        let current = nextGeneration()
        Task { await self.runRebuild(generation: current) }
    }

    private struct RebuildResult: Sendable {
        var base: [ArchiveEntry]
        var sorted: [ArchiveEntry]
        var counts: [EntryFilter: Int]
        var files: Int
        var folders: Int
        var bytes: UInt64
        var validSelection: Set<EntryID>
    }

    private func runRebuild(generation: Int) async {
        guard let snapshot else {
            displayed = []
            baseEntries = []
            filterCounts = [:]
            displayedFileCount = 0
            displayedFolderCount = 0
            displayedBytes = 0
            return
        }
        let base = snapshot.tree.children(of: currentFolder)
        let filter = self.filter
        let sort = self.sort
        let query = self.searchText
        let result = await Task.detached(priority: .userInitiated) {
            Self.computeRebuild(base: base, filter: filter, sort: sort, query: query)
        }.value
        guard generation == self.generation else { return }
        baseEntries = result.base
        filterCounts = result.counts
        displayed = result.sorted
        displayedFileCount = result.files
        displayedFolderCount = result.folders
        displayedBytes = result.bytes
        selection.formIntersection(result.validSelection)
    }

    /// Pure, off-main work: filter, search, sort, and count in two passes.
    nonisolated private static func computeRebuild(base: [ArchiveEntry],
                                                  filter: EntryFilter,
                                                  sort: EntrySort,
                                                  query: String) -> RebuildResult {
        var list = base.filter { filter.matches($0) }
        if !query.isEmpty {
            list = list.filter {
                $0.path.description.localizedCaseInsensitiveContains(query)
            }
        }
        let sorted = sort.sorted(list)
        let counts = makeFilterCounts(base)
        var files = 0
        var folders = 0
        var bytes: UInt64 = 0
        for entry in sorted {
            if entry.kind == .folder { folders += 1 } else { files += 1 }
            bytes &+= entry.size
        }
        return RebuildResult(base: base, sorted: sorted, counts: counts,
                             files: files, folders: folders, bytes: bytes,
                             validSelection: Set(sorted.map(\.id)))
    }

    /// Synchronous twin of `runRebuild` for snapshot mode and previews only.
    /// Sample data is dozens of rows, so the main thread never notices.
    private func rebuildSynchronously() {
        guard let snapshot else {
            displayed = []
            baseEntries = []
            filterCounts = [:]
            displayedFileCount = 0
            displayedFolderCount = 0
            displayedBytes = 0
            return
        }
        let result = Self.computeRebuild(
            base: snapshot.tree.children(of: currentFolder),
            filter: filter, sort: sort, query: searchText)
        baseEntries = result.base
        filterCounts = result.counts
        displayed = result.sorted
        displayedFileCount = result.files
        displayedFolderCount = result.folders
        displayedBytes = result.bytes
        selection.formIntersection(result.validSelection)
    }

    nonisolated private static func makeFilterCounts(_ entries: [ArchiveEntry]) -> [EntryFilter: Int] {
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
