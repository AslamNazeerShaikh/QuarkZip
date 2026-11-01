import QuarkZipKit
import SwiftUI

enum AppearanceMode: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

struct SettingsView: View {
    @AppStorage("appearance") private var appearance: AppearanceMode = .system

    var body: some View {
        TabView {
            Form {
                Section("Appearance") {
                    Picker("Theme", selection: $appearance) {
                        ForEach(AppearanceMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                Section("Extraction") {
                    Text("Extraction options arrive with milestone 2.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.secondary)
                }
            }
            .formStyle(.grouped)
            .tabItem { Label("General", systemImage: "gearshape") }

            Form {
                Section("QuarkZip") {
                    LabeledContent("Version", value: Bundle.main.appVersion)
                    LabeledContent("Engine", value: SevenZipArchiveService.engineVersion)
                    LabeledContent("License", value: "LGPL-3.0")
                }
                Section("Engine credits") {
                    Text("Archive engine by Igor Pavlov and the 7-Zip project. QuarkZip is an independent front end, licensed LGPL-3.0.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .formStyle(.grouped)
            .tabItem { Label("About", systemImage: "info.circle") }
        }
        .frame(width: 480, height: 300)
    }
}

extension Bundle {
    var appVersion: String {
        let short = infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(short) (\(build))"
    }
}
