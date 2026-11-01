import SwiftUI
import QuarkZipKit
import UniformTypeIdentifiers

/// Centered empty state with one primary action and an optional secondary.
struct QZEmptyState<Actions: View>: View {
    let symbol: String
    let title: String
    let message: String
    @ViewBuilder var actions: Actions

    var body: some View {
        VStack(spacing: QZTheme.Space.l) {
            Image(systemName: symbol)
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(QZTheme.Palette.accent)
                .accessibilityHidden(true)
            VStack(spacing: QZTheme.Space.s) {
                Text(title)
                    .font(QZTheme.Typography.title)
                    .foregroundStyle(QZTheme.Palette.primary)
                Text(message)
                    .font(QZTheme.Typography.body)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 380)
            }
            actions
                .padding(.top, QZTheme.Space.xs)
        }
        .padding(QZTheme.Space.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// A large drop target used on the welcome page and while dragging over the
/// browser. The pulse runs once on enter, never in a loop.
struct QZDropZone: View {
    var isTargeted: Bool
    let action: () -> Void

    @State private var pulse = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button(action: action) {
            VStack(spacing: QZTheme.Space.m) {
                Image(systemName: "arrow.down.doc")
                    .font(.system(size: 34, weight: .light))
                    .foregroundStyle(QZTheme.Palette.accent)
                Text("Drop an archive here")
                    .font(QZTheme.Typography.headline)
                    .foregroundStyle(QZTheme.Palette.primary)
                Text("or press ⌘O to choose one")
                    .font(QZTheme.Typography.callout)
                    .foregroundStyle(QZTheme.Palette.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, QZTheme.Space.xxxl)
            .background(
                RoundedRectangle(cornerRadius: QZTheme.Radius.panel)
                    .fill(isTargeted
                          ? QZTheme.Palette.accent.opacity(0.10)
                          : QZTheme.Palette.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: QZTheme.Radius.panel)
                    .strokeBorder(
                        isTargeted ? QZTheme.Palette.accent : QZTheme.Palette.separator,
                        style: StrokeStyle(lineWidth: isTargeted ? 2 : 1,
                                           dash: isTargeted ? [] : [6, 4])
                    )
            )
            .scaleEffect(pulse ? 1.01 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Drop an archive here, or open the file chooser")
        .onChange(of: isTargeted) { _, targeted in
            guard targeted, !reduceMotion else { return }
            withAnimation(QZMotion.animation(QZTheme.Motion.standard, reduceMotion: reduceMotion)) { pulse = true }
            withAnimation(QZMotion.animation(QZTheme.Motion.gentle.delay(0.18), reduceMotion: reduceMotion)) { pulse = false }
        }
    }
}

/// Path segments above the entry list.
struct QZBreadcrumb: View {
    let archiveName: String
    let segments: [ArchivePath]
    let onRoot: () -> Void
    let onSelect: (ArchivePath) -> Void

    var body: some View {
        HStack(spacing: QZTheme.Space.xs) {
            Button(action: onRoot) {
                Image(systemName: "archivebox")
                    .font(.system(size: 11, weight: .semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(QZTheme.Palette.textSecondary)
            .help(archiveName)
            .accessibilityLabel("Archive root")

            ForEach(segments, id: \.self) { segment in
                Image(systemName: "chevron.compact.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(QZTheme.Palette.textFaint)
                    .accessibilityHidden(true)
                Button(segment.name) { onSelect(segment) }
                    .buttonStyle(.plain)
                    .font(QZTheme.Typography.callout)
                    .foregroundStyle(segment == segments.last
                                     ? QZTheme.Palette.primary
                                     : QZTheme.Palette.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, QZTheme.Space.l)
        .padding(.vertical, QZTheme.Space.s)
        .background(.bar)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(QZTheme.Palette.separator)
                .frame(height: 1)
        }
    }
}

/// Bottom status line.
struct QZStatusBar: View {
    let text: String
    let selectionCount: Int
    let isLoading: Bool
    var filter: String?
    var engine: String?

    var body: some View {
        HStack(spacing: QZTheme.Space.s) {
            if isLoading {
                ProgressView()
                    .controlSize(.mini)
            }
            Text(text)
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.textSecondary)
            if let filter {
                QZBadge(text: filter, tint: QZTheme.Palette.accent, symbol: "line.3.horizontal.decrease")
            }
            Spacer()
            if selectionCount > 0 {
                Text("\(selectionCount) selected")
                    .font(QZTheme.Typography.caption.weight(.medium))
                    .foregroundStyle(QZTheme.Palette.primary)
                    .monospacedDigit()
            }
            if let engine {
                Text(engine)
                    .font(QZTheme.Typography.micro)
                    .foregroundStyle(QZTheme.Palette.textFaint)
                    .padding(.leading, QZTheme.Space.xs)
            }
        }
        .padding(.horizontal, QZTheme.Space.l)
        .frame(height: QZTheme.Size.statusBar)
        .background(QZTheme.Palette.headerBackground)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(QZTheme.Palette.separator)
                .frame(height: 1)
        }
    }
}

/// Inline, dismissible error above the content.
struct QZErrorBanner: View {
    let error: ArchiveError
    let onDismiss: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: QZTheme.Space.s) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(QZTheme.Palette.warning)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: QZTheme.Space.xxs) {
                Text(error.message)
                    .font(QZTheme.Typography.body)
                if let detail = error.detail, !detail.isEmpty {
                    Text(detail)
                        .font(QZTheme.Typography.caption)
                        .foregroundStyle(QZTheme.Palette.textSecondary)
                        .textSelection(.enabled)
                }
            }
            Spacer(minLength: QZTheme.Space.s)
            Button("Dismiss", action: onDismiss)
                .buttonStyle(.plain)
                .font(QZTheme.Typography.caption)
                .foregroundStyle(QZTheme.Palette.textSecondary)
        }
        .padding(QZTheme.Space.m)
        .background(QZTheme.Palette.warning.opacity(0.10))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(QZTheme.Palette.warning.opacity(0.35))
                .frame(height: 1)
        }
    }
}

