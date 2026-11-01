import SwiftUI

/// Frosted dashboard card: system material, a glossy top highlight, a
/// light-catching edge, and a layered soft shadow.
///
/// Dashboard surfaces only (welcome cards, header KPIs). Rows, lists, and
/// detail cards stay solid in `QZCard` so dense text never sits on
/// translucency. Text tokens are unchanged, so the contrast gate holds.
struct QZGlassCard<Content: View>: View {
    var padding: CGFloat = QZTheme.Space.card
    @ViewBuilder var content: Content

    init(padding: CGFloat = QZTheme.Space.card,
         @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background {
                RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous)
                    .fill(gloss)
            }
            .overlay {
                RoundedRectangle(cornerRadius: QZTheme.Radius.card, style: .continuous)
                    // White edge light, not text: the frosted rim around glass.
                    .strokeBorder(.white.opacity(0.25), lineWidth: 0.5)
            }
            .shadow(color: .black.opacity(QZTheme.Elevation.cardOpacity),
                    radius: QZTheme.Elevation.cardRadius,
                    y: QZTheme.Elevation.cardY)
    }

    private var gloss: LinearGradient {
        LinearGradient(colors: [.white.opacity(0.16),
                                .white.opacity(0.04),
                                .clear],
                       startPoint: .top, endPoint: .bottom)
    }
}
