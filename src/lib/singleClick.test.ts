import { afterEach, describe, expect, it, vi } from "vitest";
import { SINGLE_CLICK_WINDOW_MS, installSingleClickGuard } from "./singleClick";

/// Click-through guard: a dialog-button press records its screen rect; a
/// near-immediate click outside dialogs on that same spot is swallowed
/// once (the second half of a fast double-click). Everything else passes.
describe("singleClick", () => {
  let now = 0;
  let uninstall: (() => void) | null = null;

  const IN_RECT = {
    x: 100,
    y: 100,
    width: 40,
    height: 20,
    top: 100,
    left: 100,
    bottom: 120,
    right: 140,
  } as DOMRect;

  afterEach(() => {
    uninstall?.();
    uninstall = null;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function setup() {
    now = 1000;
    uninstall = installSingleClickGuard(() => now);
    document.body.innerHTML =
      '<div role="dialog"><button id="in">ok</button></div><button id="out">under</button>';
    vi.spyOn(
      document.getElementById("in")!,
      "getBoundingClientRect",
    ).mockReturnValue(IN_RECT);
    let outsideClicks = 0;
    document
      .getElementById("out")!
      .addEventListener("click", () => outsideClicks++);
    const clickAt = (x: number, y: number) => {
      const ev = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      });
      // The fall-through click lands where the dialog button was; the
      // coordinates (not the target) decide, like the real guard.
      document.getElementById("out")!.dispatchEvent(ev);
      return ev;
    };
    return {
      pressInside: () =>
        document
          .getElementById("in")!
          .dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          ),
      clickOutsideAt: clickAt,
      clickElsewhere: () => clickAt(300, 300),
      outsideClicks: () => outsideClicks,
    };
  }

  it("should_swallow_the_same_spot_click_once", () => {
    const t = setup();
    t.pressInside();
    now += SINGLE_CLICK_WINDOW_MS - 1;
    expect(t.clickOutsideAt(110, 110).defaultPrevented).toBe(true);
    expect(t.outsideClicks()).toBe(0);
    // One-shot: the next same-spot click passes.
    now += 1;
    expect(t.clickOutsideAt(110, 110).defaultPrevented).toBe(false);
    expect(t.outsideClicks()).toBe(1);
  });

  it("should_pass_clicks_elsewhere_immediately", () => {
    const t = setup();
    t.pressInside();
    now += 1;
    expect(t.clickElsewhere().defaultPrevented).toBe(false);
    expect(t.outsideClicks()).toBe(1);
  });

  it("should_pass_clicks_after_the_window", () => {
    const t = setup();
    t.pressInside();
    now += SINGLE_CLICK_WINDOW_MS;
    expect(t.clickOutsideAt(110, 110).defaultPrevented).toBe(false);
    expect(t.outsideClicks()).toBe(1);
  });

  it("should_never_block_dialog_controls_themselves", () => {
    const t = setup();
    t.pressInside();
    now += 1;
    let dialogClicks = 0;
    document
      .getElementById("in")!
      .addEventListener("click", () => dialogClicks++);
    t.pressInside();
    expect(dialogClicks).toBe(1);
  });

  it("should_stop_guarding_after_uninstall", () => {
    const t = setup();
    t.pressInside();
    uninstall?.();
    uninstall = null;
    now += 1;
    expect(t.clickOutsideAt(110, 110).defaultPrevented).toBe(false);
    expect(t.outsideClicks()).toBe(1);
  });
});
