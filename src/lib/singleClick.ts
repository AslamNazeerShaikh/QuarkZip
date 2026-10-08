/// Single-press guard against click-through: when a modal dialog closes
/// on a button press, the second half of a fast double-click lands on
/// the same spot — whatever the dialog uncovered (reopening confirms,
/// toggling checkboxes, opening pickers) — and reads as a double
/// operation.
///
/// A press on a control *inside* a dialog records its screen rect; a
/// near-immediate click *outside* dialogs on that same spot is swallowed
/// synchronously at capture time (no React round-trip, so even
/// back-to-back events are caught) and the guard disarms — one-shot, so
/// legitimate follow-ups (Proceed → OK, Cancel → anywhere else) always
/// land. Clicks on dialog chrome/text and every dialog control always
/// pass: dialogs stay fully interactive, and only the single dangerous
/// click is ever dropped. `now` is injectable for tests.
export const SINGLE_CLICK_WINDOW_MS = 300;
const RECT_SLOP_PX = 8;

export function installSingleClickGuard(
  now: () => number = Date.now,
): () => void {
  const dialog = '[role="dialog"]';
  const control =
    'button,input,select,textarea,a,[role="button"],[role="checkbox"],[role="option"],[role="switch"],[role="spinbutton"]';
  let armedAt = -Infinity;
  let armedRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(dialog)) {
      if (target.closest(control)) {
        const box = (
          target.closest(control) as Element
        ).getBoundingClientRect();
        armedAt = now();
        armedRect = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
      }
      return;
    }
    if (
      armedRect !== null &&
      now() - armedAt < SINGLE_CLICK_WINDOW_MS &&
      e.clientX >= armedRect.x - RECT_SLOP_PX &&
      e.clientX <= armedRect.x + armedRect.width + RECT_SLOP_PX &&
      e.clientY >= armedRect.y - RECT_SLOP_PX &&
      e.clientY <= armedRect.y + armedRect.height + RECT_SLOP_PX
    ) {
      armedAt = -Infinity;
      armedRect = null;
      e.stopPropagation();
      e.preventDefault();
    }
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
