import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TitleBar from "./TitleBar";

const controls = vi.hoisted(() => ({
  minimize: vi.fn(),
  toggleMaximize: vi.fn(),
  close: vi.fn(),
  isMaximized: vi.fn(async () => false),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: controls.minimize,
    toggleMaximize: controls.toggleMaximize,
    close: controls.close,
    isMaximized: controls.isMaximized,
    onResized: () => Promise.resolve(() => {}),
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: () => Promise.resolve(),
}));

describe("TitleBar", () => {
  it("should_render_window_controls_when_mounted", () => {
    const { container } = render(<TitleBar archive={null} maximized={false} />);
    const header = container.querySelector("header");
    expect(header).toHaveAttribute("data-tauri-drag-region");
    expect(screen.getByRole("button", { name: "Minimize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maximize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("should_show_archive_path_in_centered_title", () => {
    const { container } = render(<TitleBar archive="/tmp/a.zip" maximized={false} />);
    expect(container.querySelector("header")?.textContent).toBe(
      'QuarkZip | "Path: /tmp/a.zip"',
    );
  });

  it("should_show_restore_when_maximized", () => {
    render(<TitleBar archive={null} maximized />);
    expect(
      screen.getByRole("button", { name: "Restore" }),
    ).toBeInTheDocument();
  });

  it("should_call_window_actions_when_buttons_clicked", async () => {
    const user = userEvent.setup();
    render(<TitleBar archive={null} maximized={false} />);
    await user.click(screen.getByRole("button", { name: "Minimize" }));
    await user.click(screen.getByRole("button", { name: "Maximize" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(controls.minimize).toHaveBeenCalled();
    expect(controls.toggleMaximize).toHaveBeenCalled();
    expect(controls.close).toHaveBeenCalled();
  });
});
