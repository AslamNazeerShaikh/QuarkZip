import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AboutDialog from "./AboutDialog";
import type { AppInfo } from "../lib/appInfo";

const info: AppInfo = {
  version: "0.1.0",
  releaseDate: "2026-10-05",
  commitId: "abc1234",
  os: "Linux",
  arch: "x64 (x86_64)",
};

describe("AboutDialog", () => {
  it("should_render_nothing_when_closed", () => {
    render(<AboutDialog open={false} info={info} onOk={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_show_app_info_rows_and_licenses_when_open", () => {
    render(<AboutDialog open info={info} onOk={() => {}} />);
    expect(
      screen.getByRole("dialog", { name: "About QuarkZip" }),
    ).toBeInTheDocument();
    expect(screen.getByText("App Name")).toBeInTheDocument();
    expect(screen.getByText("QuarkZip")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("abc1234")).toBeInTheDocument();
    expect(screen.getByText("Linux")).toBeInTheDocument();
    expect(screen.getByText("x64 (x86_64)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "7-zip.org" })).toHaveAttribute(
      "href",
      "https://www.7-zip.org/",
    );
    expect(screen.getByText(/Made with/)).toBeInTheDocument();
  });

  it("should_call_on_ok_when_ok_clicked", async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    render(<AboutDialog open info={info} onOk={onOk} />);
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it("should_call_on_ok_when_escape_pressed_or_backdrop_clicked", async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    const { container } = render(<AboutDialog open info={info} onOk={onOk} />);
    await user.keyboard("{Escape}");
    expect(onOk).toHaveBeenCalledTimes(1);
    const backdrop = container.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
  });
});
