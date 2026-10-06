import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PasswordDialog from "./PasswordDialog";

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

function setup(onAccept = vi.fn(), onCancel = vi.fn()) {
  render(
    <PasswordDialog
      open
      archive="/tmp/secret.zip"
      acceptLabel="Open"
      onAccept={onAccept}
      onCancel={onCancel}
    />,
  );
  return { onAccept, onCancel };
}

describe("PasswordDialog", () => {
  it("should_require_a_password_before_checking", async () => {
    const user = userEvent.setup();
    setup();
    expect(
      await screen.findByRole("dialog", { name: "Password required" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    await user.type(screen.getByLabelText("Password"), "pw");
    expect(screen.getByRole("button", { name: "Check" })).toBeEnabled();
  });

  it("should_verify_and_reveal_open_on_correct_password", async () => {
    const user = userEvent.setup();
    const { onAccept } = setup();
    await user.type(screen.getByLabelText("Password"), "Correct123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(invokeCtl.calls[0]).toMatchObject({
      cmd: "test_archive",
      args: { path: "/tmp/secret.zip", password: "Correct123" },
    });
    act(() => invokeCtl.progress?.(50));
    expect(
      screen.getByRole("progressbar", { name: "Password verification" }),
    ).toBeInTheDocument();
    act(() => invokeCtl.resolve?.("Everything is Ok"));
    expect(await screen.findByText("Password correct.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onAccept).toHaveBeenCalledWith("/tmp/secret.zip", "Correct123");
  });

  it("should_show_the_caller_accept_label_after_verifying", async () => {
    const user = userEvent.setup();
    render(
      <PasswordDialog
        open
        archive="/tmp/secret.zip"
        acceptLabel="Extract"
        onAccept={() => {}}
        onCancel={() => {}}
      />,
    );
    await user.type(screen.getByLabelText("Password"), "Correct123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    act(() => invokeCtl.resolve?.("Everything is Ok"));
    expect(
      await screen.findByRole("button", { name: "Extract" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open" }),
    ).not.toBeInTheDocument();
  });

  it("should_shake_and_offer_retry_on_wrong_password", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Check" }));
    act(() => invokeCtl.reject?.("ERROR: Wrong password : data.csv"));
    expect(
      await screen.findByText("Wrong password — try again."),
    ).toBeInTheDocument();
    // No Open button on a miss — only Check (retry) + Cancel.
    expect(
      screen.queryByRole("button", { name: "Open" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should_surface_non_password_errors", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Check" }));
    act(() => invokeCtl.reject?.("Cannot open file: gone"));
    expect(
      await screen.findByText("Cannot open file: gone"),
    ).toBeInTheDocument();
  });

  it("should_toggle_password_visibility", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("should_close_only_via_cancel_or_escape", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    const dialog = await screen.findByRole("dialog", {
      name: "Password required",
    });
    expect(dialog).toBeInTheDocument();
    const backdrop = dialog.querySelector(":scope > [aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    if (backdrop) await user.click(backdrop as Element);
    expect(onCancel).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
