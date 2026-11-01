import QuarkZipKit
import SwiftUI

struct SettingsView: View {
    var body: some View {
        TabView {
            GeneralSettingsView()
                .tabItem { Label("General", systemImage: "gearshape") }
            AboutSettingsView()
                .tabItem { Label("About", systemImage: "info.circle") }
        }
        .frame(width: 500, height: 400)
    }
}

struct GeneralSettingsView: View {
    @AppStorage("density") private var density: QZDensity = .compact

    var body: some View {
        Form {
            Section("Appearance") {
                Text("QuarkZip follows your Mac's appearance and accent color. Category colors stay fixed so file types remain recognizable.")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Section("Density") {
                Picker("Row Density", selection: $density) {
                    ForEach(QZDensity.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                Text("Compact fits more entries on screen. Comfortable adds breathing room.")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
            }

            Section("File Types") {
                Text("Categories and methods use a fixed semantic palette. Text stays at full contrast; color appears as a dot, icon, or bar.")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .formStyle(.grouped)
    }
}

struct AboutSettingsView: View {
    var body: some View {
        Form {
            Section("QuarkZip") {
                LabeledContent("Version", value: Bundle.main.appVersion)
                LabeledContent("Engine", value: SevenZipArchiveService.engineVersion)
                LabeledContent("License", value: "LGPL-3.0")
            }
            Section("Engine credits") {
                Text("Archive engine by Igor Pavlov and the 7-Zip project. QuarkZip is an independent front end, licensed LGPL-3.0.")
                    .font(QZTheme.Typography.callout)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .formStyle(.grouped)
    }
}

extension Bundle {
    var appVersion: String {
        let short = infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(short) (\(build))"
    }
}
