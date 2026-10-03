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
        { path: "dropped.txt", size: 10, modified: null },
      ]);
    }
    return Promise.reject(`unexpected command ${cmd}`);
  },
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

  it("should_render_open_button_with_empty_list_when_no_archive_open", () => {
    const { container } = render(<App />);
    expect(
      screen.getByRole("button", { name: "Open archive" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(0);
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
  });
});
describe("theme switching", () => {
  it("should_apply_dark_class_when_dark_chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should_remove_dark_class_when_light_chosen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should_mark_active_choice_pressed", async () => {
    const user = userEvent.setup();
    render(<App />);
    const system = screen.getByRole("button", { name: "System" });
    expect(system).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(
      screen.getByRole("button", { name: "Light" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
