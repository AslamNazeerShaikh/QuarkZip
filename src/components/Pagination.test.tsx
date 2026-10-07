import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

function setup(page = 0) {
  const onPage = vi.fn();
  const onPageSize = vi.fn();
  render(
    <Pagination
      page={page}
      pageCount={3}
      pageSize={100}
      total={250}
      onPage={onPage}
      onPageSize={onPageSize}
    />,
  );
  return { onPage, onPageSize };
}

describe("Pagination", () => {
  it("should_size_the_input_to_the_page_count", () => {
    const { rerender } = render(
      <Pagination
        page={0}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    // 1 digit → floor width.
    expect(screen.getByRole("spinbutton", { name: "Go to page" })).toHaveStyle({
      width: "40px",
    });
    rerender(
      <Pagination
        page={100008}
        pageCount={100011}
        pageSize={100}
        total={10001002}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    // 6 digits → 6*8+16.
    expect(screen.getByRole("spinbutton", { name: "Go to page" })).toHaveStyle({
      width: "64px",
    });
  });

  it("should_portal_the_size_menu_past_card_overflow", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Rows per page" }));
    const menu = screen.getByRole("listbox", { name: "Rows per page" });
    // Viewport-anchored at <body>, never inside the clipping card.
    expect(menu.parentElement).toBe(document.body);
  });

  it("should_show_page_readout_and_total", () => {
    setup();
    // Combined jump+readout: editable current page plus the total.
    expect(screen.getByRole("spinbutton", { name: "Go to page" })).toHaveValue(
      "1",
    );
    expect(screen.getByText("/ 3")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("should_shrink_to_an_icon_and_expand_back_when_compact", async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    const { rerender } = render(
      <Pagination
        page={1}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
        compact
        onExpand={onExpand}
      />,
    );
    // Full shell gone; icon names the page.
    expect(
      screen.queryByRole("spinbutton", { name: "Go to page" }),
    ).not.toBeInTheDocument();
    const icon = screen.getByRole("button", {
      name: "Show pagination — 2 / 3",
    });
    await user.click(icon);
    expect(onExpand).toHaveBeenCalledOnce();
    // Restored: full shell back.
    rerender(
      <Pagination
        page={1}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "Go to page" })).toHaveValue(
      "2",
    );
    expect(screen.getByText("/ 3")).toBeInTheDocument();
  });

  it("should_disable_prev_on_first_page", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
  });

  it("should_navigate_pages", async () => {
    const user = userEvent.setup();
    const { onPage } = setup(1);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(2);
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPage).toHaveBeenCalledWith(0);
  });

  it("should_offer_page_sizes_up_to_10k_plus_all", async () => {
    const user = userEvent.setup();
    const { onPageSize } = setup();
    await user.click(screen.getByRole("button", { name: "Rows per page" }));
    const listbox = screen.getByRole("listbox", { name: "Rows per page" });
    for (const label of ["100", "1,000", "5,000", "10,000", "All"]) {
      expect(listbox).toContainElement(
        screen.getByRole("option", { name: label }),
      );
    }
    await user.click(screen.getByRole("option", { name: "All" }));
    expect(onPageSize).toHaveBeenCalledWith("all");
  });

  it("should_close_size_menu_on_escape", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Rows per page" }));
    expect(
      screen.getByRole("listbox", { name: "Rows per page" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("listbox", { name: "Rows per page" }),
    ).not.toBeInTheDocument();
  });
});

describe("Pagination show-all cap", () => {
  it("should_hide_all_above_the_spacer_cap", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        page={0}
        pageCount={1}
        pageSize={10000}
        total={10_000_001}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rows per page" }));
    expect(
      screen.queryByRole("option", { name: "All" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "10,000" })).toBeInTheDocument();
  });

  it("should_offer_all_within_the_cap", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        page={0}
        pageCount={1}
        pageSize={100}
        total={1000}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rows per page" }));
    expect(screen.getByRole("option", { name: "All" })).toBeInTheDocument();
  });

  it("should_coerce_active_all_when_a_bigger_archive_opens", () => {
    const onPageSize = vi.fn();
    render(
      <Pagination
        page={0}
        pageCount={1}
        pageSize="all"
        total={10_000_001}
        onPage={() => {}}
        onPageSize={onPageSize}
      />,
    );
    expect(onPageSize).toHaveBeenCalledWith(10000);
  });
});

describe("Pagination page jump", () => {
  function setupJump(page = 0) {
    const onPage = vi.fn();
    render(
      <Pagination
        page={page}
        pageCount={3}
        pageSize={100}
        total={250}
        onPage={onPage}
        onPageSize={() => {}}
      />,
    );
    return { onPage };
  }

  it("should_show_current_page_and_jump_on_enter", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    expect(field).toHaveValue("1");
    await user.clear(field);
    await user.type(field, "3");
    await user.keyboard("{Enter}");
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("should_clamp_out_of_range_pages", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    await user.clear(field);
    await user.type(field, "99");
    await user.keyboard("{Enter}");
    expect(onPage).not.toHaveBeenCalled();
  });

  it("should_ignore_non_numeric_input", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    await user.clear(field);
    await user.type(field, "abc");
    await user.keyboard("{Enter}");
    expect(onPage).not.toHaveBeenCalled();
  });

  it("should_revert_on_escape", async () => {
    const user = userEvent.setup();
    setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    await user.clear(field);
    await user.type(field, "2");
    await user.keyboard("{Escape}");
    expect(field).toHaveValue("1");
  });

  it("should_hide_the_jump_on_single_pages", () => {
    render(
      <Pagination
        page={0}
        pageCount={1}
        pageSize="all"
        total={250}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    expect(
      screen.queryByRole("spinbutton", { name: "Go to page" }),
    ).not.toBeInTheDocument();
  });

  it("should_confirm_trailing_garbage_with_read_off_target", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    // "2xyz" reads off page 2 but still confirms first.
    await user.clear(field);
    await user.type(field, "2xyz");
    await user.keyboard("{Enter}");
    expect(onPage).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Invalid page" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Jump" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("should_confirm_weird_input_with_jump_or_cancel", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    await user.clear(field);
    await user.type(field, "99");
    await user.keyboard("{Enter}");
    // Popup names the range; nothing jumped yet.
    expect(onPage).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Invalid page" })).toBeVisible();
    // i18next interpolation splits the sentence across nodes.
    expect(screen.getByText(/doesn’t exist/)).toBeInTheDocument();
    // Jump executes the same clamp (99 → page 3).
    await user.click(screen.getByRole("button", { name: "Jump" }));
    expect(onPage).toHaveBeenCalledWith(2);
    expect(
      screen.queryByRole("dialog", { name: "Invalid page" }),
    ).not.toBeInTheDocument();
  });

  it("should_cancel_the_popup_and_restore_the_current_page", async () => {
    const user = userEvent.setup();
    const { onPage } = setupJump();
    const field = screen.getByRole("spinbutton", { name: "Go to page" });
    await user.clear(field);
    await user.type(field, "abc");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Invalid page" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onPage).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Invalid page" }),
    ).not.toBeInTheDocument();
    expect(field).toHaveValue("1");
  });
});
