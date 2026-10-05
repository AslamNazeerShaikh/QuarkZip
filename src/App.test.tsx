import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

type DragEvent =
  | { payload: { type: "over" | "enter"; paths: string[] } }
  | { payload: { type: "leave" } }
  | { payload: { type: "drop"; paths: string[] } };

const dragHandlers: Array<(e: DragEvent) => void> = [];

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: (cb: (e: DragEvent) => void) => {
      dragHandlers.push(cb);
      return Promise.resolve(() => {});
    },
  }),
}));

const extractCtl = vi.hoisted(() => ({ fail: true }));

vi.mock("@tauri-apps/api/core", () => ({
  Channel: class {
    onmessage: (value: unknown) => void;
    constructor(cb?: (value: unknown) => void) {
      this.onmessage = cb ?? (() => {});
    }
  },
  invoke: (cmd: string) => {
    if (cmd === "drag_window") return Promise.resolve();
    if (cmd === "list_archive") {
      return Promise.resolve([
        { path: "dropped.txt", size: 10, modified: null, is_folder: false },
      ]);
    }
    if (cmd === "extract_archive") {
      return extractCtl.fail
        ? Promise.reject(`unexpected command ${cmd}`)
        : Promise.resolve("Everything is Ok");
    }
    return Promise.reject(`unexpected command ${cmd}`);
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  dirname: () => Promise.resolve("/tmp"),
}));

const osCtl = vi.hoisted(() => ({ platform: "linux" }));

vi.mock("@tauri-apps/plugin-os", () => ({
  platform: () => osCtl.platform,
}));

beforeEach(() => {
  osCtl.platform = "linux";
  extractCtl.fail = true;
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("App blank canvas", () => {
  it("should_render_drag_header_when_mounted", () => {
    const { container } = render(<App />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute("data-tauri-drag-region");
  });

  it("should_hide_custom_titlebar_when_on_macos", async () => {
    osCtl.platform = "macos";
    const { container } = render(<App />);
    // Native traffic lights own the title bar there — no custom header.
    await waitFor(() =>
      expect(container.querySelector("header")).not.toBeInTheDocument(),
    );
  });

  it("should_render_open_button_with_empty_table_when_no_archive_open", () => {
    const { container } = render(<App />);
    expect(
      screen.getByRole("button", { name: "Open archive" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[role='row']")).toHaveLength(0);
  });
});

describe("drag and drop", () => {
  it("should_show_overlay_when_file_hovers", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({ payload: { type: "over", paths: [] } });
    expect(await screen.findByText("Drop to open archive")).toBeInTheDocument();
  });

  it("should_list_dropped_archive_when_file_dropped", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(await screen.findByText("dropped.txt")).toBeInTheDocument();
    // Details backend is unmocked here, so the card shows its fallback.
    expect(await screen.findByText(/Details unavailable/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open archive/i }),
    ).not.toBeInTheDocument();
  });

  it("should_show_footer_actions_when_archive_open", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(await screen.findByRole("button", { name: "Open new…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extract" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose where to extract" }),
    ).toBeInTheDocument();
  });

  it("should_show_app_name_and_path_in_centered_window_title", async () => {
    const { container } = render(<App />);
    const header = container.querySelector("header");
    expect(header?.textContent).toBe("QuarkZip");
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await screen.findByText("dropped.txt");
    expect(header?.textContent).toBe('QuarkZip | "Path: /tmp/dropped.zip"');
  });

  it("should_confirm_then_report_extract_failure_in_status", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    // dirname is mocked to /tmp, so Extract enables; the invoke mock
    // rejects unknown commands, exercising the error status path.
    const extract = await screen.findByRole("button", { name: "Extract" });
    expect(extract).toBeEnabled();
    await user.click(extract);
    expect(await screen.findByRole("dialog", { name: "Extract files?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction failed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("unexpected command extract_archive")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_show_completion_popup_when_extract_succeeds", async () => {
    extractCtl.fail = false;
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(await screen.findByRole("button", { name: "Extract" }));
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction complete" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 files extracted to/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_close_confirm_dialog_when_cancel_clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(await screen.findByRole("button", { name: "Extract" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_open_test_dialog_from_overview_that_backdrop_cannot_close", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(await screen.findByRole("button", { name: "Test" }));
    expect(
      await screen.findByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
    // The test_archive mock rejects → failure result with an enabled OK.
    const ok = await screen.findByRole("button", { name: "OK" });
    expect(ok).toBeEnabled();
    const backdrop = container.querySelector("[role='dialog'] > [aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop as Element);
    expect(screen.getByRole("dialog", { name: "Test archive" })).toBeInTheDocument();
    await user.click(ok);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_open_checksum_dialog_from_overview", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(await screen.findByRole("button", { name: "Checksum" }));
    expect(
      await screen.findByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();
  });
});
describe("theme switching", () => {
  async function openSwitcher(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Change theme" }));
  }

  it("should_keep_sliding_indicator_inside_the_theme_shell", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSwitcher(user);
    // Regression: without `relative` on the shell, the absolutely
    // positioned indicator escapes to <main> as a full-height block.
    expect(
      screen.getByRole("group", { name: "Color theme" }),
    ).toHaveClass("relative");
  });

  it("should_apply_dark_class_when_dark_chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSwitcher(user);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should_remove_dark_class_when_light_chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSwitcher(user);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    await screen.findByRole("button", { name: "Change theme" });
    await openSwitcher(user);
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should_mark_active_choice_pressed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSwitcher(user);
    const system = screen.getByRole("button", { name: "System" });
    expect(system).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Light" }));
    await screen.findByRole("button", { name: "Change theme" });
    await openSwitcher(user);
    expect(
      screen.getByRole("button", { name: "Light" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("should_collapse_after_choice_made", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSwitcher(user);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    // Indicator slides first; the control minimizes after the delay.
    expect(
      await screen.findByRole("button", { name: "Change theme" }),
    ).toBeInTheDocument();
  });
});
