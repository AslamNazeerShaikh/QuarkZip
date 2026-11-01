import SwiftUI

/// A fixed-size emoji glyph that respects the 4 pt grid and VoiceOver rules.
///
/// The box is always 20x20 with 12 pt text, so rows never shift when emojis
/// are toggled. Decorative by default; pass a label when it carries meaning.
struct QZEmoji: View {
    let emoji: String
    var label: String?

    var body: some View {
        Text(emoji)
            .font(QZTheme.Typography.emoji)
            .frame(width: QZTheme.Size.emojiBox, height: QZTheme.Size.emojiBox)
            .accessibilityHidden(label == nil)
            .accessibilityLabel(label ?? "")
    }
}
