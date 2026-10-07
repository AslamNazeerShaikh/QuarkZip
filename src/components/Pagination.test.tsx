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
  it("should_show_page_readout_and_total", () => {
    setup();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
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
