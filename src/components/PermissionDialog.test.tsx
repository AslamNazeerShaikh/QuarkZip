import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PermissionDialog from "./PermissionDialog";

/// Permission-denied dialog: names the blocked path, offers the Privacy
/// Settings grant and (extract only) another folder. Inert backdrop, Esc
/// cancels — same modal language as every dialog.
describe("PermissionDialog", () => {
  it("should_show_path_actions_and_dismiss", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    const onChooseFolder = vi.fn();
    const onCancel = vi.fn();
    render(
      <PermissionDialog
        open
        mode="extract"
        path="/tmp/denied"
        onOpenSettings={onOpenSettings}
        onChooseFolder={onChooseFolder}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Permission needed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("/tmp/denied")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open Privacy Settings" }),
    );
    expect(onOpenSettings).toHaveBeenCalledOnce();
    await user.click(
      screen.getByRole("button", { name: "Choose Different Folder" }),
    );
    expect(onChooseFolder).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should_offer_no_folder_choice_for_tests", () => {
    render(
      <PermissionDialog
        open
        mode="test"
        path="/tmp/a.zip"
        onOpenSettings={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Choose Different Folder" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Privacy Settings" }),
    ).toBeInTheDocument();
  });

  it("should_render_nothing_when_closed", () => {
    const { container } = render(
      <PermissionDialog
        open={false}
        mode="extract"
        path="/tmp/denied"
        onOpenSettings={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
