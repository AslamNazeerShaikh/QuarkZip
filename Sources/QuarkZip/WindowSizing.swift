import AppKit
import SwiftUI

/// Enforces the window's content size range.
///
/// SwiftUI exposes a default size and a minimum content size, but not a hard
/// maximum. The archive header, table columns, and inspector need a known
/// range to keep their layout. This view finds the hosting window and sets
/// `contentMinSize`/`contentMaxSize`, clamped to the current screen, once.
struct WindowSizing: NSViewRepresentable {
    let minSize: CGSize
    let maxSize: CGSize
    let defaultSize: CGSize

    func makeNSView(context: Context) -> NSView {
        let view = NSView(frame: .zero)
        DispatchQueue.main.async {
            configure(view.window)
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async {
            configure(nsView.window)
        }
    }

    private func configure(_ window: NSWindow?) {
        guard let window else { return }

        let screen = window.screen ?? NSScreen.main
        let visible = screen?.visibleFrame.size ?? maxSize
        let contentMin = NSSize(width: minSize.width, height: minSize.height)
        let contentMax = NSSize(
            width: max(contentMin.width, min(maxSize.width, visible.width - 20)),
            height: max(contentMin.height, min(maxSize.height, visible.height - 60))
        )

        window.contentMinSize = contentMin
        window.contentMaxSize = contentMax
        window.minSize = window.frameRect(
            forContentRect: NSRect(origin: .zero, size: contentMin)
        ).size
        window.maxSize = window.frameRect(
            forContentRect: NSRect(origin: .zero, size: contentMax)
        ).size

        let current = window.contentRect(forFrameRect: window.frame).size
        if current.width < contentMin.width || current.height < contentMin.height {
            let target = NSSize(
                width: max(contentMin.width, min(defaultSize.width, contentMax.width)),
                height: max(contentMin.height, min(defaultSize.height, contentMax.height))
            )
            window.setContentSize(target)
        }
    }
}
