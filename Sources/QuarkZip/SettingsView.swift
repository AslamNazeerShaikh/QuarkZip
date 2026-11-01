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
        .frame(width: 520, height: 460)
    }
}

struct GeneralSettingsView: View {
    @AppStorage("density") private var density: QZDensity = .comfortable
    @AppStorage("appearance") private var appearance: QZAppearance = .system
    @AppStorage("showEmoji") private var showEmoji = false

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $appearance) {
                    ForEach(QZAppearance.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                Text("System follows your Mac. Light and Dark override it right away, for this app only.")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
            }

            Section("Emoji") {
                Toggle("Show emoji in lists and sidebars", isOn: $showEmoji)
                    .font(QZTheme.Typography.body)
                Text("One fixed emoji per file type, in a 20 point box so rows never shift. Turn it off for a text-only look.")
                    .font(QZTheme.Typography.caption)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
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
                Text("Categories and methods use a fixed semantic palette. Text stays at full contrast; color appears as a dot, icon, or bar. Sizes always use binary units, where 1 KiB = 1,024 bytes.")
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
            Section("About") {
                Text("Choose QuarkZip > About QuarkZip in the menu bar, or the info button in the toolbar, for the full About card.")
                    .font(QZTheme.Typography.caption)
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
