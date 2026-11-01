// swift-tools-version: 6.2
import PackageDescription
import Foundation

// The 7-Zip tree lives at the repository root and is reached through a
// symlink inside the target, because SwiftPM requires every source of a
// target to live under that target's path.
let packageRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let vendorRoot = packageRoot.appendingPathComponent("vendor/7zip")
guard FileManager.default.fileExists(atPath: vendorRoot.path) else {
    fatalError("vendor/7zip is missing. Restore the pinned 7-Zip 26.05 tree.")
}

func files(under directory: String,
           extensions: Set<String> = ["c", "cpp"],
           recursive: Bool = true) -> [String] {
    let base = vendorRoot.appendingPathComponent(directory)
    guard let walker = FileManager.default.enumerator(atPath: base.path) else {
        return []
    }
    var result: [String] = []
    for case let relative as String in walker {
        let url = base.appendingPathComponent(relative)
        let ext = url.pathExtension.lowercased()
        guard extensions.contains(ext) else { continue }
        let name = url.lastPathComponent
        if name == "StdAfx.cpp" || name == "ArchiveExports.cpp" { continue }
        if name.hasPrefix("DllExports") { continue }
        if !recursive && relative.contains("/") { continue }
        result.append("vendor/" + directory + "/" + relative)
    }
    return result.sorted()
}

func explicit(_ paths: [String]) -> [String] {
    paths.map { "vendor/" + $0 }
}

let archiveSources = files(under: "CPP/7zip/Archive")
let compressSources = files(under: "CPP/7zip/Compress")
let cryptoSources = files(under: "CPP/7zip/Crypto")
let sevenZipCommonSources = files(under: "CPP/7zip/Common")
let commonSources = files(under: "CPP/Common")
let cSources = files(under: "C", extensions: ["c"], recursive: false)

let windowsSources = explicit([
    "CPP/Windows/FileDir.cpp",
    "CPP/Windows/FileFind.cpp",
    "CPP/Windows/FileIO.cpp",
    "CPP/Windows/FileName.cpp",
    "CPP/Windows/PropVariant.cpp",
    "CPP/Windows/PropVariantConv.cpp",
    "CPP/Windows/PropVariantUtils.cpp",
    "CPP/Windows/System.cpp",
    "CPP/Windows/TimeUtils.cpp",
    "CPP/Windows/ErrorMsg.cpp",
    "CPP/Windows/FileLink.cpp",
    "CPP/Windows/SystemInfo.cpp",
    "CPP/Windows/Synchronization.cpp",
])

let uiCommonSources = explicit([
    "CPP/7zip/UI/Common/LoadCodecs.cpp",
    "CPP/7zip/UI/Common/OpenArchive.cpp",
    "CPP/7zip/UI/Common/DefaultName.cpp",
    "CPP/7zip/UI/Common/SetProperties.cpp",
    "CPP/7zip/UI/Common/ArchiveOpenCallback.cpp",
    "CPP/7zip/UI/Common/ArchiveExtractCallback.cpp",
    "CPP/7zip/UI/Common/ExtractingFilePath.cpp",
    "CPP/7zip/UI/Common/PropIDUtils.cpp",
])

let engineSources = ["Bridge.cpp", "Guids.cpp"] + cSources + archiveSources + compressSources
    + cryptoSources + sevenZipCommonSources + commonSources
    + windowsSources + uiCommonSources

let package = Package(
    name: "QuarkZip",
    platforms: [.macOS(.v26)],
    products: [
        .executable(name: "QuarkZip", targets: ["QuarkZip"]),
    ],
    targets: [
        // 7-Zip plus our C ABI. One target on purpose: every object is
        // linked into the executable, so upstream's static archive
        // registrars are never dropped.
        .target(
            name: "QZEngine",
            path: "Sources/QZEngine",
            sources: engineSources,
            publicHeadersPath: "include",
            cSettings: [
                .define("_FILE_OFFSET_BITS", to: "64"),
                .define("_LARGEFILE_SOURCE"),
                .define("_REENTRANT"),
                .define("NDEBUG"),
                .unsafeFlags(["-fPIC", "-w"]),
            ],
            cxxSettings: [
                .define("_FILE_OFFSET_BITS", to: "64"),
                .define("_LARGEFILE_SOURCE"),
                .define("_REENTRANT"),
                .define("NDEBUG"),
                .headerSearchPath("vendor/CPP"),
                .unsafeFlags(["-fPIC", "-std=c++17", "-w"]),
            ],
            linkerSettings: [
                .linkedLibrary("c++"),
            ]
        ),
        .target(
            name: "QuarkZipKit",
            dependencies: ["QZEngine"],
            path: "Sources/QuarkZipKit"
        ),
        .executableTarget(
            name: "QuarkZip",
            dependencies: ["QuarkZipKit"],
            path: "Sources/QuarkZip",
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),
        .testTarget(
            name: "QuarkZipKitTests",
            dependencies: ["QuarkZipKit", "QZEngine"],
            path: "Tests/QuarkZipKitTests"
        ),
        .testTarget(
            name: "QZEngineTests",
            dependencies: ["QZEngine", "QuarkZipKit"],
            path: "Tests/QZEngineTests"
        ),
    ],
    swiftLanguageModes: [.v6]
)
