import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChecksumDialog from "./ChecksumDialog";

const { ChannelStub } = vi.hoisted(() => {
  class ChannelStub {
    onmessage: (value: number) => void;
    constructor(cb?: (value: number) => void) {
      this.onmessage = cb ?? (() => {});
    }
  }
  return { ChannelStub };
});

const invokeCtl = vi.hoisted(() => ({
  calls: [] as Array<{ cmd: string; args: unknown }>,
  progress: null as ((pct: number) => void) | null,
  resolve: null as ((value: string) => void) | null,
  reject: null as ((reason: unknown) => void) | null,
}));

vi.mock("@tauri-apps/api/core", () => ({
  Channel: ChannelStub,
  invoke: (cmd: string, args: unknown) => {
    invokeCtl.calls.push({ cmd, args });
    if (cmd === "cancel_checksum") return Promise.resolve(null);
    return new Promise<string>((resolve, reject) => {
      invokeCtl.resolve = resolve;
      invokeCtl.reject = reject;
      const channel = (args as { onProgress?: InstanceType<typeof ChannelStub> }).onProgress;
      invokeCtl.progress = (pct: number) => channel?.onmessage(pct);
    });
  },
}));

beforeEach(() => {
  invokeCtl.calls = [];
  invokeCtl.progress = null;
  invokeCtl.resolve = null;
  invokeCtl.reject = null;
});

const DIGEST = "d41d8cd98f00b204e9800998ecf8427e";

describe("ChecksumDialog", () => {
  it("should_calculate_and_report_a_match", async () => {
    const user = userEvent.setup();
    render(<ChecksumDialog open archive="/tmp/a.7z" onClose={() => {}} />);
    expect(
      await screen.findByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Checksum algorithm" }));
    await user.click(screen.getByRole("option", { name: "MD5" }));
    await user.type(
      screen.getByLabelText("Expected hash"),
      "D41D8CD98F00B204E9800998ECF8427E",
    );

    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const last = invokeCtl.calls[invokeCtl.calls.length - 1];
    expect(last?.cmd).toBe("checksum_file");
    expect(last?.args).toMatchObject({
      path: "/tmp/a.7z",
      algorithm: "md5",
    });

    act(() => invokeCtl.progress?.(30));
    expect(
      screen.getByRole("progressbar", { name: "Checksum progress" }),
    ).toHaveAttribute("aria-valuenow", "30");

    act(() => invokeCtl.resolve?.(DIGEST));
    expect(await screen.findByText(DIGEST)).toBeInTheDocument();
    expect(screen.getByText("Hashes match")).toBeInTheDocument();
  });

  it("should_report_a_mismatch", async () => {
    const user = userEvent.setup();
    render(<ChecksumDialog open archive="/tmp/a.7z" onClose={() => {}} />);
    expect(
      await screen.findByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Expected hash"), "00");
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    act(() => invokeCtl.resolve?.(DIGEST));
    expect(await screen.findByText("Hashes do not match")).toBeInTheDocument();
  });

  it("should_cancel_without_closing_and_stay_open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChecksumDialog open archive="/tmp/a.7z" onClose={onClose} />);
    expect(
      await screen.findByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      invokeCtl.calls.some((c) => c.cmd === "cancel_checksum"),
    ).toBe(true);
    // Backend surfaces the abort as a rejection; the popup stays open.
    act(() => invokeCtl.reject?.("Checksum calculation cancelled."));
    expect(await screen.findByText(/Calculation cancelled/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should_ignore_backdrop_clicks_and_escape_while_running", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <ChecksumDialog open archive="/tmp/a.7z" onClose={onClose} />,
    );
    expect(
      await screen.findByRole("dialog", { name: "Calculate checksum" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const backdrop = container.querySelector(
      "[role='dialog'] > [aria-hidden='true']",
    );
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop);
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
