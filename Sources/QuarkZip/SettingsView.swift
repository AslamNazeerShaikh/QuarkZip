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
    @AppStorage("accent") private var accent: AccentChoice = .blue
    @AppStorage("density") private var density: QZDensity = .compact

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

                    LabeledContent("Accent") {
                        HStack(spacing: QZTheme.Space.s) {
                            ForEach(AccentChoice.allCases) { choice in
                                Button {
                                    accent = choice
                                } label: {
                                    Circle()
                                        .fill(choice.color)
                                        .frame(width: 18, height: 18)
                                        .overlay {
                                            Circle()
                                                .strokeBorder(.white.opacity(0.55), lineWidth: 0.5)
                                        }
                                        .overlay {
                                            Circle()
                                                .strokeBorder(QZTheme.Palette.primary.opacity(0.8),
                                                              lineWidth: accent == choice ? 2 : 0)
                                                .padding(-3)
                                        }
                                }
                                .buttonStyle(.plain)
                                .help(choice.title)
                                .accessibilityLabel("\(choice.title) accent")
                                .accessibilityAddTraits(accent == choice ? .isSelected : [])
                            }
                        }
                    }
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
                        .foregroundStyle(QZTheme.Palette.secondary)
                }

                Section("File Types") {
                    Text("Categories and methods use a fixed color palette in light and dark. The accent color only changes controls and selection.")
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.secondary)
                        .fixedSize(horizontal: false, vertical: true)
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
        .frame(width: 500, height: 430)
    }
}

extension Bundle {
    var appVersion: String {
        let short = infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(short) (\(build))"
    }
}
