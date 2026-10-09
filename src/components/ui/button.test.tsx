import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

/// Locks the shell-chrome unification: every action variant wears the
/// ThemeSwitch look (translucent tint, 10px radius, 1px border,
/// card shadow, h-9 chrome height) — hues as tints, never solids.
describe("Button shell chrome", () => {
  const cases = [
    ["primary", "qz-tint-accent"],
    ["warning", "qz-tint-orange"],
    ["accent", "qz-tint-info"],
    ["success", "qz-tint-green"],
    ["highlight", "qz-tint-yellow"],
  ] as const;
  for (const [variant, tint] of cases) {
    it(`should_wear_tinted_shell_chrome_when_variant_${variant}`, () => {
      render(<Button variant={variant}>Go</Button>);
      const btn = screen.getByRole("button", { name: "Go" });
      expect(btn).toHaveClass(tint);
      expect(btn).toHaveClass("rounded-[10px]");
      expect(btn).toHaveClass("shadow-[var(--qz-shadow-card)]");
    });
  }

  it("should_size_chrome_actions_at_h9", () => {
    render(<Button size="bar">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("h-9");
  });

  it("should_keep_modal_actions_at_h10", () => {
    render(<Button size="default">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("h-10");
  });

  it("should_use_the_native_arrow_cursor_never_the_hand", () => {
    render(<Button title="Go">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    // The hand (`cursor-pointer`) is URL-links-only per Apple HIG —
    // buttons keep the arrow (pinned by the base rule in index.css).
    expect(btn.className).not.toMatch(/cursor-pointer/);
  });

  it("should_answer_presses_with_a_scale_and_tooltip", () => {
    render(<Button title="Extract the files">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("motion-safe:active:scale-[0.97]");
    expect(btn).toHaveAttribute("title", "Extract the files");
  });
});
