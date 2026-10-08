import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExtractDialog, { type ExtractMode } from "./ExtractDialog";

const invokeMock = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

function setup(mode: ExtractMode = "selected", selected = 12, total = 10021) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ExtractDialog
      open
      mode={mode}
      selected={selected}
      total={total}
      dest="/tmp/out"
      archivePath="/tmp/photo.zip"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  return { onCancel, onConfirm };
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(false);
});

describe("ExtractDialog", () => {
  it("should_show_selected_of_total_when_selection_given", () => {
    setup("selected");
    expect(
      screen.getByRole("dialog", { name: "Extract selected files?" }),
    ).toBeInTheDocument();
    // Counts share one element with the static copy: match the whole line.
    expect(screen.getByText(/12 of 10,021 selected files/)).toBeInTheDocument();
    expect(screen.getByText("/tmp/out")).toBeInTheDocument();
  });

  it("should_show_all_files_when_mode_all", () => {
    setup("all", 0, 6);
    expect(
      screen.getByRole("dialog", { name: "Extract all files?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/All 6 files/)).toBeInTheDocument();
  });

  it("should_offer_extract_all_when_nothing_selected", () => {
    setup("empty", 0, 6);
    expect(
      screen.getByRole("dialog", { name: "Nothing selected" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/extract all 6 files instead/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extract All" }),
    ).toBeInTheDocument();
  });

  it("should_confirm_or_cancel_when_buttons_clicked", async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup("selected", 3);
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith("/tmp/out");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should_cancel_when_escape_pressed", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup("selected", 3);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should_prefill_the_archive_basename_when_folder_checked", async () => {
    const user = userEvent.setup();
    setup("all", 0, 6);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    expect(screen.getByLabelText("Subfolder name")).toHaveValue("photo");
  });

  it("should_block_proceed_on_colliding_names", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(true);
    setup("all", 0, 6);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/already exists here/)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Proceed" })).toBeDisabled();
  });

  it("should_confirm_into_the_subfolder_when_name_is_free", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(false);
    const { onConfirm } = setup("selected", 3);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    const field = screen.getByLabelText("Subfolder name");
    await user.clear(field);
    await user.type(field, "mine");
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("path_exists", {
        path: "/tmp/out/mine",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Proceed" })).toBeEnabled(),
    );
    expect(screen.getByText("/tmp/out/mine")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(onConfirm).toHaveBeenCalledWith("/tmp/out/mine");
  });

  it("should_reject_reserved_names_without_probing", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup("all", 0, 6);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    const field = screen.getByLabelText("Subfolder name");
    await user.clear(field);
    await user.type(field, "..");
    expect(screen.getByText(/reserved names/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should_show_the_byte_budget_and_preview_a_single_stamp", async () => {
    const user = userEvent.setup();
    setup("all", 0, 6);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    // Live budget for the prefilled basename (photo = 5 bytes).
    expect(screen.getByText("5 / 255 bytes (UTF-8)")).toBeInTheDocument();
    // The toggle mints one stamp: the field stays clean…
    await user.click(
      screen.getByRole("checkbox", { name: "Append date-time" }),
    );
    const field = screen.getByLabelText("Subfolder name");
    expect((field as HTMLInputElement).value).toBe("photo");
    // …the preview shows the stamped name once (never stacked)…
    const preview = screen.getByText(
      /^photo_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/,
    );
    expect(preview).toBeInTheDocument();
    // …the budget counts the stamp against the reduced limit…
    expect(screen.getByText("25 / 235 bytes (UTF-8)")).toBeInTheDocument();
    // …and toggling twice never stacks: off removes it, on mints fresh.
    await user.click(
      screen.getByRole("checkbox", { name: "Append date-time" }),
    );
    expect(screen.queryByText(/^photo_\d{4}/)).not.toBeInTheDocument();
    expect(screen.getByText("5 / 255 bytes (UTF-8)")).toBeInTheDocument();
    // Final-path preview tracks the stamped name.
    await user.click(
      screen.getByRole("checkbox", { name: "Append date-time" }),
    );
    expect(
      screen.getByText(/\/tmp\/out\/photo_\d{4}-\d{2}-\d{2}_/),
    ).toBeInTheDocument();
  });

  it("should_block_names_that_overflow_the_stamped_budget", async () => {
    const user = userEvent.setup();
    setup("all", 0, 6);
    await user.click(
      screen.getByRole("checkbox", { name: "Extract into a new subfolder" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Append date-time" }),
    );
    const field = screen.getByLabelText("Subfolder name");
    await user.clear(field);
    await user.type(field, "a".repeat(236));
    // 236 > 255 − 20: stamp-specific error, Proceed blocked.
    expect(screen.getByText(/turn off date-time/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed" })).toBeDisabled();
  });

  it("should_render_nothing_when_closed", () => {
    render(
      <ExtractDialog
        open={false}
        mode="all"
        selected={0}
        total={0}
        dest=""
        archivePath=""
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
