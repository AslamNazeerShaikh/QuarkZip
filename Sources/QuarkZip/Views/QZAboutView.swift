import QuarkZipKit
import SwiftUI

/// The About sheet. One place for version, engine, license, and credits.
struct QZAboutView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("showEmoji") private var showEmoji = true

    var body: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.l) {
            HStack(spacing: QZTheme.Space.m) {
                QZIconTile(symbol: "archivebox.fill",
                           tint: QZTheme.Palette.category(.archive),
                           size: 48)
                VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                    HStack(spacing: QZTheme.Space.s) {
                        if showEmoji {
                            QZEmoji(emoji: "📦", label: "QuarkZip")
                        }
                        Text("QuarkZip")
                            .font(QZTheme.Typography.title)
                            .foregroundStyle(QZTheme.Palette.primary)
                    }
                    Text("An archive manager that feels at home on the Mac.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                }
                Spacer(minLength: QZTheme.Space.s)
            }

            QZCard {
                VStack(alignment: .leading, spacing: QZTheme.Space.s) {
                    QZSectionLabel(title: "This App")
                    QZInspectorField(label: "Version", value: Bundle.main.appVersion,
                                     monospaced: true)
                    QZInspectorField(label: "Engine", value: SevenZipArchiveService.engineVersion,
                                     monospaced: true)
                    QZInspectorField(label: "License", value: "LGPL-3.0")
                    QZInspectorField(label: "Network", value: "Offline, no telemetry")
                }
            }

            QZCard {
                VStack(alignment: .leading, spacing: QZTheme.Space.s) {
                    QZSectionLabel(title: "Credits")
                    Text("Archive engine by Igor Pavlov and the 7-Zip project. QuarkZip is an independent front end and never claims the 7-Zip name.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("RAR extraction only, through the unRAR restriction. Sizes use binary IEC units, where 1 KiB = 1,024 bytes.")
                        .font(QZTheme.Typography.callout)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            HStack(spacing: QZTheme.Space.s) {
                Button {
                    copyVersion()
                } label: {
                    Label("Copy Version", systemImage: "doc.on.doc")
                }
                .buttonStyle(QZSecondaryButtonStyle())
                Spacer(minLength: QZTheme.Space.s)
                Button("Done") {
                    model.showAbout = false
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)
                .keyboardShortcut(.return, modifiers: [])
            }
        }
        .padding(QZTheme.Space.margin)
        .frame(width: 480)
        .background(QZTheme.Palette.background)
    }

    private func copyVersion() {
        let text = "QuarkZip \(Bundle.main.appVersion) · \(SevenZipArchiveService.engineVersion)"
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }
}
