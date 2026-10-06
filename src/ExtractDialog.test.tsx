import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExtractDialog from "./ExtractDialog";

function setup(selected: number, total = 10021) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ExtractDialog
      open
      selected={selected}
      total={total}
      dest="/tmp/out"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  return { onCancel, onConfirm };
}

describe("ExtractDialog", () => {
  it("should_show_selected_of_total_when_selection_given", () => {
    setup(12);
    expect(
      screen.getByRole("dialog", { name: "Extract files?" }),
    ).toBeInTheDocument();
    // Counts share one element with the static copy: match the whole line.
    expect(screen.getByText(/12 of 10,021 selected files/)).toBeInTheDocument();
    expect(screen.getByText("/tmp/out")).toBeInTheDocument();
  });

  it("should_show_all_files_when_nothing_selected", () => {
    setup(0, 6);
    expect(screen.getByText(/All 6 files/)).toBeInTheDocument();
  });

  it("should_confirm_or_cancel_when_buttons_clicked", async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup(3);
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should_cancel_when_escape_pressed", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup(3);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should_render_nothing_when_closed", () => {
    render(
      <ExtractDialog
        open={false}
        selected={0}
        total={0}
        dest=""
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
