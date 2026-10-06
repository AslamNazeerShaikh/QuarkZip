import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestDialog from "./TestDialog";

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
    return new Promise<string>((resolve, reject) => {
      invokeCtl.resolve = resolve;
      invokeCtl.reject = reject;
      const channel = (
        args as { onProgress?: InstanceType<typeof ChannelStub> }
      ).onProgress;
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

describe("TestDialog", () => {
  it("should_start_the_test_on_open_and_report_success", async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    render(<TestDialog open archive="/tmp/a.7z" onOk={onOk} />);
    expect(
      await screen.findByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
    expect(invokeCtl.calls[0]?.cmd).toBe("test_archive");
    expect(invokeCtl.calls[0]?.args).toMatchObject({ path: "/tmp/a.7z" });
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();

    act(() => invokeCtl.progress?.(42));
    expect(
      screen.getByRole("progressbar", { name: "Test progress" }),
    ).toHaveAttribute("aria-valuenow", "42");

    act(() => invokeCtl.resolve?.("Everything is Ok"));
    expect(
      await screen.findByText(/Integrity check passed/),
    ).toBeInTheDocument();
    const ok = screen.getByRole("button", { name: "OK" });
    expect(ok).toBeEnabled();
    await user.click(ok);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it("should_report_backend_failures", async () => {
    render(<TestDialog open archive="/tmp/a.7z" onOk={() => {}} />);
    expect(
      await screen.findByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
    act(() => invokeCtl.reject?.("CRC Failed in data"));
    expect(await screen.findByText("CRC Failed in data")).toBeInTheDocument();
  });

  it("should_ignore_backdrop_clicks_and_escape_while_running", async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    const { container } = render(
      <TestDialog open archive="/tmp/a.7z" onOk={onOk} />,
    );
    expect(
      await screen.findByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();
    const backdrop = container.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop);
    await user.keyboard("{Escape}");
    expect(onOk).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Test archive" }),
    ).toBeInTheDocument();

    act(() => invokeCtl.resolve?.("Everything is Ok"));
    await screen.findByText(/Integrity check passed/);
    await user.keyboard("{Escape}");
    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
