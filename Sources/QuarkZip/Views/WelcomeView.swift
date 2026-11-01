import QuarkZipKit
import SwiftUI
import UniformTypeIdentifiers

struct WelcomeView: View {
    @Environment(AppModel.self) private var model
    @State private var isTargeted = false

    var body: some View {
        VStack(spacing: QZTheme.Space.xxxl) {
            Spacer(minLength: QZTheme.Space.xl)

            VStack(spacing: QZTheme.Space.m) {
                Image(systemName: "archivebox.fill")
                    .font(.system(size: 52, weight: .regular))
                    .foregroundStyle(
                        LinearGradient(colors: [QZTheme.Palette.accent,
                                                QZTheme.Palette.accent.opacity(0.55)],
                                       startPoint: .top,
                                       endPoint: .bottom)
                    )
                    .accessibilityHidden(true)
                Text("QuarkZip")
                    .font(QZTheme.Typography.title)
                Text("Look inside an archive before you unpack it.")
                    .font(QZTheme.Typography.body)
                    .foregroundStyle(QZTheme.Palette.secondary)
            }

            QZDropZone(isTargeted: isTargeted) {
                model.chooseArchive()
            }
            .frame(maxWidth: 520)

            if !model.recents.isEmpty {
                recents
                    .frame(maxWidth: 520, alignment: .leading)
            }

            Spacer(minLength: QZTheme.Space.xl)
        }
        .padding(QZTheme.Space.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .dropDestination(for: URL.self) { urls, _ in
            guard let url = urls.first(where: { $0.isFileURL }) else { return false }
            model.open(url)
            return true
        } isTargeted: { targeted in
            withAnimation(QZTheme.Motion.quick) { isTargeted = targeted }
        }
    }

    private var recents: some View {
        VStack(alignment: .leading, spacing: QZTheme.Space.xs) {
            Text("Recent")
                .font(QZTheme.Typography.caption.weight(.medium))
                .foregroundStyle(QZTheme.Palette.tertiary)
                .textCase(.uppercase)
                .padding(.bottom, QZTheme.Space.xxs)

            ForEach(model.recents.prefix(5), id: \.self) { url in
                Button {
                    model.open(url)
                } label: {
                    HStack(spacing: QZTheme.Space.s) {
                        Image(systemName: "doc.zipper")
                            .foregroundStyle(QZTheme.Palette.accent)
                            .frame(width: 18)
                        VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                            Text(url.lastPathComponent)
                                .font(QZTheme.Typography.body)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Text(url.deletingLastPathComponent().path(percentEncoded: false))
                                .font(QZTheme.Typography.caption)
                                .foregroundStyle(QZTheme.Palette.secondary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(QZTheme.Space.s)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .background(QZTheme.Palette.surface,
                            in: RoundedRectangle(cornerRadius: QZTheme.Radius.control))
            }
        }
    }
}
