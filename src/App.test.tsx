import { render, screen } from "@testing-library/react";
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

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string) => {
    if (cmd === "drag_window") return Promise.resolve();
    if (cmd === "list_archive") {
      return Promise.resolve([
        { path: "dropped.txt", size: 10, modified: null, is_folder: false },
      ]);
    }
    return Promise.reject(`unexpected command ${cmd}`);
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  dirname: () => Promise.resolve("/tmp"),
}));

beforeEach(() => {
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
    expect(await screen.findByText(/1 entries/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open archive/i }),
    ).not.toBeInTheDocument();
  });

  it("should_prefix_path_with_file_path_label", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(await screen.findByText(/File Path:/)).toBeInTheDocument();
  });

  it("should_show_footer_actions_when_archive_open", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(await screen.findByRole("button", { name: "Browse…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extract" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose where to extract" }),
    ).toBeInTheDocument();
  });

  it("should_report_extract_failure_in_status", async () => {
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
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/unexpected command extract_archive/);
  });
});
describe("theme switching", () => {
  async function openSwitcher(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Change theme" }));
  }

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
