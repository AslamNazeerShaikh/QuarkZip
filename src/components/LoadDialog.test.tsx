import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoadDialog from "./LoadDialog";

const { ChannelStub } = vi.hoisted(() => {
  class ChannelStub {
    onmessage: (value: unknown) => void;
    constructor(cb?: (value: unknown) => void) {
      this.onmessage = cb ?? (() => {});
    }
  }
  return { ChannelStub };
});

const invokeCtl = vi.hoisted(() => ({
  calls: [] as Array<{ cmd: string; args: unknown }>,
}));

vi.mock("@tauri-apps/api/core", () => ({
  Channel: ChannelStub,
  invoke: (cmd: string, args: unknown) => {
    invokeCtl.calls.push({ cmd, args });
    return Promise.resolve(null);
  },
}));

beforeEach(() => {
  invokeCtl.calls = [];
});

describe("LoadDialog", () => {
  it("should_render_nothing_when_closed", () => {
    const { container } = render(
      <LoadDialog
        open={false}
        archive="/tmp/a.7z"
        phase="listing"
        stats={null}
        elapsedMs={0}
        onCancel={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("should_show_live_counters_and_indeterminate_progress", () => {
    render(
      <LoadDialog
        open
        archive="/tmp/a.7z"
        phase="listing"
        stats={{ bytes: 1536, entries: 1500 }}
        elapsedMs={2000}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Opening archive" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reading file list…")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("1.5KiB")).toBeInTheDocument();
    expect(screen.getByText("2 s")).toBeInTheDocument();
    // Indeterminate: labelled bar with no value.
    const bar = screen.getByRole("progressbar", {
      name: "Opening progress",
    });
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("should_show_details_phase_and_placeholders_without_stats", () => {
    render(
      <LoadDialog
        open
        archive="/tmp/a.7z"
        phase="details"
        stats={null}
        elapsedMs={0}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Reading archive details…")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("should_invoke_cancel_and_close_on_cancel_click", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <LoadDialog
        open
        archive="/tmp/a.7z"
        phase="listing"
        stats={null}
        elapsedMs={0}
        onCancel={onCancel}
      />,
    );
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
