import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

type DragEvent =
  | { payload: { type: "over" | "enter"; paths: string[] } }
  | { payload: { type: "leave" } }
  | { payload: { type: "drop"; paths: string[] } };

const dragHandlers: Array<(e: DragEvent) => void> = [];

const pickerCtl = vi.hoisted(() => ({
  open: vi.fn(async () => null),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: pickerCtl.open,
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: (cb: (e: DragEvent) => void) => {
      dragHandlers.push(cb);
      return Promise.resolve(() => {});
    },
  }),
}));

const extractCtl = vi.hoisted(() => ({
  fail: true,
  failMessage: null as string | null,
  calls: [] as Array<{ dest: string; files: string[] }>,
}));

const listCtl = vi.hoisted(() => ({
  deferList: false,
  releaseList: null as null | ((value: unknown) => void),
  calls: [] as string[],
}));

vi.mock("@tauri-apps/api/core", () => ({
  Channel: class {
    onmessage: (value: unknown) => void;
    constructor(cb?: (value: unknown) => void) {
      this.onmessage = cb ?? (() => {});
    }
  },
  invoke: (cmd: string, args?: unknown) => {
    listCtl.calls.push(cmd);
    if (cmd === "drag_window") return Promise.resolve();
    if (cmd === "cancel_list_archive") return Promise.resolve(null);
    // P2: the backend holds the listing; list opens return the total,
    // pages arrive through get_page (sliced here, like the server).
    const entriesFor = (path: string) => {
      if (path === "/tmp/secret.zip") {
        return [
          { path: "secret.txt", size: 5, modified: null, is_folder: false },
        ];
      }
      if (path === "/tmp/locked.zip") {
        // Content-encrypted zip: names list without a password, but
        // extraction needs one — the reported Extract-before-password case.
        return [
          { path: "locked.txt", size: 5, modified: null, is_folder: false },
        ];
      }
      if (path === "/tmp/stress.zip") {
        // Stress-shaped listing: 10k entries with hostile names (200-char
        // runs, unicode, `=`, spaces, no-extension, nulls, folders).
        const entries = [];
        entries.push({
          path: `${"L".repeat(200)}.txt`,
          size: 0,
          modified: "2026-10-03 19:15:23.6692707",
          is_folder: false,
        });
        entries.push({
          path: "a-very-long-filename-that-keeps-going-and-going-and-going-and-going-and-going-and-going-and-going.txt",
          size: 0,
          modified: "2026-10-03 19:15:23.6692707",
          is_folder: false,
        });
        entries.push({
          path: "name with spaces and = equals and café ünïcode Dateiächstones.txt",
          size: 0,
          modified: "2026-10-03 19:15:23.6692707",
          is_folder: false,
        });
        entries.push({
          path: "noextension",
          size: null,
          modified: null,
          is_folder: false,
        });
        entries.push({
          path: "empty-dir/",
          size: 0,
          modified: null,
          is_folder: true,
        });
        for (let i = 1; i <= 10016; i++) {
          entries.push({
            path: `file-${String(i).padStart(5, "0")}.txt`,
            size: 0,
            modified: "2026-10-03 19:15:00",
            is_folder: false,
          });
        }
        return entries;
      }
      return [
        { path: "dropped.txt", size: 10, modified: null, is_folder: false },
      ];
    };
    if (cmd === "list_archive") {
      if (listCtl.deferList) {
        return new Promise((resolve) => {
          listCtl.releaseList = resolve as (value: unknown) => void;
        });
      }
      const { path, password } = (args ?? {}) as {
        path: string;
        password: string | null;
      };
      // Encrypted fixture: no password → 7zz-style password failure.
      if (path === "/tmp/secret.zip" && !password) {
        return Promise.reject("Enter password:\nBreak signaled");
      }
      return Promise.resolve({ total: entriesFor(path).length });
    }
    if (cmd === "get_page") {
      const { path, page, pageSize } = (args ?? {}) as {
        path: string;
        page: number;
        pageSize: number;
      };
      const all = entriesFor(path);
      const rows = all.slice(page * pageSize, (page + 1) * pageSize);
      return Promise.resolve({ rows, total: all.length });
    }
    if (cmd === "info_archive") {
      const { path } = (args ?? {}) as { path: string };
      if (path === "/tmp/stress.zip") {
        return Promise.resolve({
          container_format: "zip",
          physical_size: 1403808,
          headers_size: null,
          method: "Store",
          solid: null,
          blocks: null,
          file_count: 10021,
          folder_count: 1,
          total_unpacked: 0,
          total_packed: 0,
          compression_ratio: 0,
          max_depth: 2,
          methods: ["Store"],
          encrypted_files: 0,
          encryption_scheme: "None",
          host_os: ["Unix"],
          container_size: 1403808,
          container_modified: 1791563723,
          extra: { "64-bit": "+", Characteristics: "Zip64" },
        });
      }
      return Promise.reject(`unexpected command ${cmd}`);
    }
    if (cmd === "path_exists") {
      return Promise.resolve(false);
    }
    if (cmd === "test_archive") {
      const { path, password } = (args ?? {}) as {
        path: string;
        password: string | null;
      };
      if (password === "Correct123") return Promise.resolve("Everything is Ok");
      // Encrypted fixtures fail the 7zz way; plain archives pass.
      if (path === "/tmp/locked.zip" || path === "/tmp/secret.zip") {
        return Promise.reject("ERROR: Wrong password : data.csv");
      }
      return Promise.resolve("Everything is Ok");
    }
    if (cmd === "extract_archive") {
      const { path, dest, files, password } = (args ?? {}) as {
        path: string;
        dest: string;
        files: string[];
        password: string | null;
      };
      extractCtl.calls.push({ dest, files });
      // locked.zip without a password fails the engine way (per-file errors);
      // the app must gate instead of showing them.
      if (path === "/tmp/locked.zip" && !password) {
        return Promise.reject("ERROR: Wrong password : locked.txt");
      }
      if (extractCtl.failMessage) {
        return Promise.reject(extractCtl.failMessage);
      }
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
  extractCtl.failMessage = null;
  extractCtl.calls = [];
  listCtl.deferList = false;
  listCtl.releaseList = null;
  listCtl.calls = [];
  pickerCtl.open.mockReset();
  pickerCtl.open.mockResolvedValue(null);
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

  it("should_show_quiet_error_when_archive_picker_denied", async () => {
    // Capability denied (or headless): the picker rejects — quiet danger
    // text, never an unhandled rejection, previous listing untouched.
    pickerCtl.open.mockRejectedValueOnce("dialog denied");
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("dialog denied");
  });

  it("should_hide_open_new_until_an_archive_is_open", async () => {
    render(<App />);
    // Empty state: the card's own CTA owns opening.
    expect(
      screen.queryByRole("button", { name: "Open new…" }),
    ).not.toBeInTheDocument();
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(
      await screen.findByRole("button", { name: "Open new…" }),
    ).toBeInTheDocument();
  });

  it("should_leave_no_button_focused_on_cold_start", () => {
    // No pre-selected CTA with a selection ring at launch.
    render(<App />);
    expect(document.activeElement?.tagName).not.toBe("BUTTON");
    window.dispatchEvent(new Event("focus"));
    expect(document.activeElement?.tagName).not.toBe("BUTTON");
  });
});

describe("drag and drop", () => {
  it("should_show_overlay_when_file_hovers", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "over", paths: [] },
    });
    expect(await screen.findByText("Drop to open archive")).toBeInTheDocument();
  });

  it("should_trace_the_window_edge_with_matching_corners", async () => {
    // Flush mac window (native ~12px corners) vs. floating Linux card
    // (20px card in a 20px margin) — one radius for both misreads a corner.
    osCtl.platform = "macos";
    const { unmount } = render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "over", paths: [] },
    });
    const macFrame = await screen.findByText("Drop to open archive");
    expect(macFrame.parentElement).toHaveClass("rounded-[12px]");
    expect(macFrame.parentElement).toHaveClass("inset-3");
    unmount();
    osCtl.platform = "linux";
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "over", paths: [] },
    });
    const cardFrame = await screen.findAllByText("Drop to open archive");
    const frame = cardFrame[cardFrame.length - 1].parentElement;
    expect(frame).toHaveClass("rounded-[20px]");
    expect(frame).toHaveClass("inset-5");
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

  it("should_survive_stress_shaped_listing_without_blanking", async () => {
    // Regression: hostile names (200-char runs, unicode, `=`, spaces,
    // null sizes/dates, folders) must render, not unmount the tree.
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/stress.zip"] },
    });
    expect(await screen.findByText("file-00001.txt")).toBeInTheDocument();
    expect(
      screen.getByText(
        "name with spaces and = equals and café ünïcode Dateiächstones.txt",
      ),
    ).toBeInTheDocument();
    // Tree intact: footer actions + overview populated, no blank canvas.
    expect(
      screen.getByRole("button", { name: "Extract Selected" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Extract All" })).toBeVisible();
    expect(screen.getAllByText("Store")).toHaveLength(2);
    expect(screen.getAllByText("10,021")).toHaveLength(2);
    // Engine extras stay behind More, even at 10k rows.
    expect(screen.queryByText("Zip64")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Zip64")).toBeInTheDocument();
  });

  it("should_keep_previous_listing_when_open_is_cancelled", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    expect(await screen.findByText("dropped.txt")).toBeInTheDocument();

    // Stall the next listing mid-flight: the progress popup appears.
    listCtl.deferList = true;
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/other.zip"] },
    });
    expect(
      await screen.findByRole("dialog", { name: "Opening archive" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(listCtl.calls).toContain("cancel_list_archive");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Opening archive" }),
      ).not.toBeInTheDocument();
    });

    // The stalled listing resolves late: it must stay silent and the
    // previous listing (plus no error) must survive it.
    await act(async () => {
      listCtl.releaseList?.([
        { path: "other.txt", size: 1, modified: null, is_folder: false },
      ]);
    });
    listCtl.deferList = false;
    expect(screen.getByText("dropped.txt")).toBeInTheDocument();
    expect(screen.queryByText("other.txt")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_show_footer_actions_when_archive_open", async () => {
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    // Open moved to the titlebar (left on Linux, right on macOS).
    expect(
      await screen.findByRole("button", { name: "Open new…" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extract Selected" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extract All" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose where to extract" }),
    ).toBeInTheDocument();
  });

  it("should_show_app_name_and_path_in_centered_window_title", async () => {
    const { container } = render(<App />);
    const header = container.querySelector("header");
    expect(header?.textContent).toContain("QuarkZip");
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await screen.findByText("dropped.txt");
    expect(header?.textContent).toContain("QuarkZip |\u00a0/tmp/dropped.zip");
  });

  it("should_confirm_then_report_extract_failure_in_status", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    // dirname is mocked to /tmp, so Extract enables; the invoke mock
    // rejects unknown commands, exercising the error status path.
    const extract = await screen.findByRole("button", { name: "Extract All" });
    expect(extract).toBeEnabled();
    await user.click(extract);
    expect(
      await screen.findByRole("dialog", { name: "Extract all files?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction failed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("unexpected command extract_archive"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_offer_privacy_settings_when_extract_hits_permissions", async () => {
    extractCtl.failMessage = "Permission denied: /tmp/out";
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(
      await screen.findByRole("button", { name: "Extract All" }),
    );
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    // Permission dialog instead of the generic failure popup…
    const dialog = await screen.findByRole("dialog", {
      name: "Permission needed",
    });
    expect(dialog).toHaveTextContent("/tmp");
    // …Cancel dismisses it with no extraction recorded as failed.
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_show_completion_popup_when_extract_succeeds", async () => {
    extractCtl.fail = false;
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(
      await screen.findByRole("button", { name: "Extract All" }),
    );
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction complete" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 files extracted to/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_offer_extract_all_when_selected_pressed_with_no_selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(
      await screen.findByRole("button", { name: "Extract Selected" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Nothing selected" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_close_confirm_dialog_when_cancel_clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(
      await screen.findByRole("button", { name: "Extract All" }),
    );
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_collapse_select_everything_to_server_side_all", async () => {
    // 10M guard: selecting every row must still extract via the empty
    // file list — never a 10M-path argv over IPC.
    extractCtl.fail = false;
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await user.click(
      await screen.findByRole("checkbox", { name: "Select dropped.txt" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Extract Selected" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Extract selected files?" }),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction complete" }),
    ).toBeInTheDocument();
    expect(extractCtl.calls).toHaveLength(1);
    expect(extractCtl.calls[0].files).toEqual([]);
  });

  it("should_shrink_pagination_while_theme_is_out_and_restore_after", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await expect(await screen.findByText("1 / 1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Change theme" }));
    // Full shell yields to the icon naming the page.
    expect(
      await screen.findByRole("button", { name: /Show pagination/ }),
    ).toBeVisible();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    // Choosing minimizes the segment and restores the shell.
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(
      await screen.findByRole("button", { name: "Change theme" }),
    ).toBeVisible();
    expect(await screen.findByText("1 / 1")).toBeVisible();
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
    const backdrop = container.querySelector(
      "[role='dialog'] > [aria-hidden='true']",
    );
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop as Element);
    expect(
      screen.getByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
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

  it("should_ask_for_password_when_dropped_archive_is_encrypted", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/secret.zip"] },
    });
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    // No error shown and the previous (empty) state is untouched.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No archive open")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("No archive open")).toBeInTheDocument();
  });

  it("should_keep_current_listing_when_password_cancelled", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/dropped.zip"] },
    });
    await screen.findByText("dropped.txt");
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/secret.zip"] },
    });
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("dropped.txt")).toBeInTheDocument();
  });

  it("should_unlock_and_open_on_correct_password", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/secret.zip"] },
    });
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "Correct123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(await screen.findByRole("button", { name: "Open" }));
    expect(await screen.findByText("secret.txt")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_gate_extract_behind_password_instead_of_raw_errors", async () => {
    extractCtl.fail = false;
    const user = userEvent.setup();
    render(<App />);
    // locked.zip lists without a password (content-encrypted names visible).
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/locked.zip"] },
    });
    await screen.findByText("locked.txt");
    await user.click(
      await screen.findByRole("button", { name: "Extract All" }),
    );
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    // No failure popup — the password gate opens instead.
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Extraction failed" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "Correct123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    const gate = await screen.findByRole("dialog", {
      name: "Password required",
    });
    await user.click(within(gate).getByRole("button", { name: "Extract" }));
    expect(
      await screen.findByRole("dialog", { name: "Extraction complete" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("locked.txt")).toBeInTheDocument();
  });

  it("should_keep_state_when_extract_gate_cancelled", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/locked.zip"] },
    });
    await screen.findByText("locked.txt");
    await user.click(
      await screen.findByRole("button", { name: "Extract All" }),
    );
    await user.click(await screen.findByRole("button", { name: "Proceed" }));
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("locked.txt")).toBeInTheDocument();
  });

  it("should_gate_test_behind_password_and_rerun_after_verify", async () => {
    const user = userEvent.setup();
    render(<App />);
    dragHandlers[dragHandlers.length - 1]?.({
      payload: { type: "drop", paths: ["/tmp/locked.zip"] },
    });
    await screen.findByText("locked.txt");
    await user.click(await screen.findByRole("button", { name: "Test" }));
    // Raw 7zz password errors never surface — the gate swaps in.
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "Correct123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    const gate = await screen.findByRole("dialog", {
      name: "Password required",
    });
    await user.click(within(gate).getByRole("button", { name: "Test" }));
    expect(
      await screen.findByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Integrity check passed/),
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
    expect(screen.getByRole("group", { name: "Color theme" })).toHaveClass(
      "relative",
    );
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
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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
