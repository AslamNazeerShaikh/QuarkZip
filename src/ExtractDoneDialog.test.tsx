import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExtractDoneDialog from "./ExtractDoneDialog";

describe("ExtractDoneDialog", () => {
  it("should_show_count_and_destination_when_successful", () => {
    render(
      <ExtractDoneDialog
        open
        result={{ ok: true, fileCount: 10021, dest: "/tmp/out" }}
        onOk={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Extraction complete" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10,021 files extracted to/)).toBeInTheDocument();
    expect(screen.getByText("/tmp/out")).toBeInTheDocument();
  });

  it("should_show_message_when_failed", () => {
    render(
      <ExtractDoneDialog
        open
        result={{ ok: false, message: "No files to process", dest: "/tmp/out" }}
        onOk={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Extraction failed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No files to process")).toBeInTheDocument();
  });

  it("should_dismiss_when_ok_clicked_or_escape_pressed", async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    render(
      <ExtractDoneDialog
        open
        result={{ ok: true, fileCount: 3, dest: "/tmp/out" }}
        onOk={onOk}
      />,
    );
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onOk).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(onOk).toHaveBeenCalledTimes(2);
  });

  it("should_render_nothing_when_closed", () => {
    render(
      <ExtractDoneDialog
        open={false}
        result={{ ok: true, fileCount: 0, dest: "" }}
        onOk={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
