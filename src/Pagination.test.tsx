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
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
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
    const select = screen.getByRole("combobox", { name: "Rows per page" });
    for (const label of ["100", "1,000", "5,000", "10,000", "All"]) {
      expect(select).toContainElement(screen.getByRole("option", { name: label }));
    }
    await user.selectOptions(select, "all");
    expect(onPageSize).toHaveBeenCalledWith("all");
  });
});
