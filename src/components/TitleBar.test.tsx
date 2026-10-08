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
  const noop = () => {};
  it("should_render_window_controls_when_mounted", () => {
    const { container } = render(
      <TitleBar archive={null} maximized={false} onOpen={noop} />,
    );
    const header = container.querySelector("header");
    expect(header).toHaveAttribute("data-tauri-drag-region");
    expect(
      screen.getByRole("button", { name: "Minimize" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Maximize" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("should_show_archive_path_in_centered_title", () => {
    const { container } = render(
      <TitleBar archive="/tmp/a.zip" maximized={false} onOpen={noop} />,
    );
    // Header also carries the Open action now — assert the title part.
    expect(container.querySelector("header")?.textContent).toContain(
      "QuarkZip |\u00a0/tmp/a.zip",
    );
  });

  it("should_keep_the_file_name_visible_on_long_paths", () => {
    render(
      <TitleBar
        archive="/very/long/directory/chain/that/keeps/going/photo.zip"
        maximized={false}
        onOpen={noop}
      />,
    );
    // Middle truncation: directory part ellipsizes, file name survives.
    expect(screen.getByText("photo.zip", { exact: false })).toBeInTheDocument();
  });

  it("should_hide_open_until_an_archive_is_open", () => {
    const { rerender } = render(
      <TitleBar archive={null} maximized={false} onOpen={noop} />,
    );
    expect(
      screen.queryByRole("button", { name: "Open new…" }),
    ).not.toBeInTheDocument();
    rerender(<TitleBar archive="/tmp/a.zip" maximized={false} onOpen={noop} />);
    expect(
      screen.getByRole("button", { name: "Open new…" }),
    ).toBeInTheDocument();
  });

  it("should_hide_mac_open_until_an_archive_is_open", () => {
    const { rerender } = render(
      <TitleBar archive={null} hidden maximized={false} onOpen={noop} />,
    );
    expect(
      screen.queryByRole("button", { name: "Open new…" }),
    ).not.toBeInTheDocument();
    rerender(
      <TitleBar archive="/tmp/a.zip" hidden maximized={false} onOpen={noop} />,
    );
    expect(
      screen.getByRole("button", { name: "Open new…" }),
    ).toBeInTheDocument();
  });

  it("should_show_restore_when_maximized", () => {
    render(<TitleBar archive={null} maximized onOpen={noop} />);
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("should_call_window_actions_when_buttons_clicked", async () => {
    const user = userEvent.setup();
    render(<TitleBar archive={null} maximized={false} onOpen={noop} />);
    await user.click(screen.getByRole("button", { name: "Minimize" }));
    await user.click(screen.getByRole("button", { name: "Maximize" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(controls.minimize).toHaveBeenCalled();
    expect(controls.toggleMaximize).toHaveBeenCalled();
    expect(controls.close).toHaveBeenCalled();
  });

  it("should_offer_open_on_the_left_when_linux", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <TitleBar archive="/tmp/a.zip" maximized={false} onOpen={onOpen} />,
    );
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open new…" }),
    ).toBeInTheDocument();
  });

  it("should_tint_open_with_theme_text_not_glass_text", () => {
    // The tint shell is a surface: glass-dark text would stay black on
    // the dark tint instead of following the theme like every button.
    render(<TitleBar archive="/tmp/a.zip" maximized={false} onOpen={noop} />);
    const open = screen.getByRole("button", { name: "Open new…" });
    expect(open).toHaveClass("text-[var(--qz-text)]");
    expect(open.className).not.toContain("qz-glass-text");
  });

  it("should_size_both_bars_for_equal_button_air", () => {
    // h-23 (92px) with pt-7/pb-7 around h-9 (36px) controls: 28px air
    // above and below — the footer's equal-air treatment.
    const { container, rerender } = render(
      <TitleBar archive="/tmp/a.zip" maximized={false} onOpen={noop} />,
    );
    expect(container.querySelector("header")).toHaveClass("h-23");
    rerender(
      <TitleBar archive="/tmp/a.zip" hidden maximized={false} onOpen={noop} />,
    );
    expect(container.querySelector("#qz-titlebar-mac")).toHaveClass("h-23");
  });

  it("should_offer_open_on_the_right_when_macos_overlay", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <TitleBar
        archive="/tmp/a.zip"
        hidden
        maximized={false}
        onOpen={onOpen}
      />,
    );
    const open = screen.getByRole("button", { name: "Open new…" });
    expect(open).toBeInTheDocument();
    // Title is absolutely centered; Open rides the actions cell.
    expect(open.closest("[data-testid='mac-titlebar']")).not.toBeNull();
    await user.click(open);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("should_center_the_mac_title_regardless_of_siblings", () => {
    // Siblings are asymmetric (Open right, void left) and so is the
    // container padding (76px vs 28px): a full-width overlay centers the
    // child, which caps at the free space and truncates. The overlay must
    // be positioned against the bar itself (`relative` parent).
    const { container } = render(
      <TitleBar archive="/tmp/a.zip" hidden maximized={false} onOpen={noop} />,
    );
    expect(container.querySelector("#qz-titlebar-mac")).toHaveClass("relative");
    const title = container.querySelector("#qz-titlebar-mac-title");
    expect(title?.parentElement).toHaveClass("absolute", "inset-0");
    expect(title).toHaveClass("max-w-[calc(100%-246px)]");
  });

  it("should_show_the_readonly_warning_under_both_titles", () => {
    const hint = "Read-only — extract files, cannot modify";
    const { container, rerender } = render(
      <TitleBar archive="/tmp/a.zip" maximized={false} onOpen={noop} />,
    );
    const linuxHint = screen.getByText(hint);
    expect(linuxHint).toBeInTheDocument();
    expect(linuxHint).toHaveClass("italic");
    rerender(
      <TitleBar archive="/tmp/a.zip" hidden maximized={false} onOpen={noop} />,
    );
    expect(screen.getByText(hint)).toBeInTheDocument();
    expect(container.querySelector("#qz-titlebar-mac-title")).not.toBeNull();
    // Empty state carries no archive warning.
    rerender(<TitleBar archive={null} maximized={false} onOpen={noop} />);
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
  });

  it("should_disable_open_while_loading", () => {
    render(
      <TitleBar
        archive="/tmp/a.zip"
        maximized={false}
        onOpen={noop}
        openDisabled
      />,
    );
    expect(screen.getByRole("button", { name: "Open new…" })).toBeDisabled();
  });
});
