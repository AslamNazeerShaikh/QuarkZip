import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ArchiveEntry } from "./App";
import ArchiveTable from "./ArchiveTable";

const DATA: ArchiveEntry[] = [
  { path: "b.txt", size: 200, modified: null, is_folder: false },
  { path: "a.txt", size: 100, modified: null, is_folder: false },
  { path: "c.txt", size: 300, modified: null, is_folder: false },
];

describe("ArchiveTable", () => {
  it("should_render_all_rows", () => {
    render(<ArchiveTable data={DATA} page={0} pageSize={100} />);
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("should_sort_by_name_when_header_clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ArchiveTable data={DATA} page={0} pageSize={100} />,
    );
    const rows = () =>
      Array.from(container.querySelectorAll('div[style*="translateY"]')).map(
        (el) => el.textContent,
      );
    await user.click(screen.getByText("Name"));
    expect(rows()[0]).toContain("a.txt");
    await user.click(screen.getByText("Name"));
    expect(rows()[0]).toContain("c.txt");
  });

  it("should_notify_selection_when_checkbox_clicked", async () => {
    const user = userEvent.setup();
    const seen: ReadonlySet<string>[] = [];
    render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        onSelectionChange={(sel) => seen.push(sel)}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Select b.txt" }));
    expect(seen[seen.length - 1]).toEqual(new Set(["b.txt"]));
  });

  it("should_show_serial_index_and_local_time", () => {
    render(
      <ArchiveTable
        data={[
          {
            path: "a.txt",
            size: 1,
            modified: "2026-10-03 21:39:45",
            is_folder: false,
          },
        ]}
        page={0}
        pageSize={100}
      />,
    );
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Oct 3, 2026, 9:39:45 PM")).toBeInTheDocument();
  });

  it("should_show_empty_state_when_no_data", () => {
    render(<ArchiveTable data={[]} page={0} pageSize={100} />);
    expect(screen.getByText("No entries")).toBeInTheDocument();
  });

  it("should_toggle_row_when_checkbox_clicked", async () => {
    const user = userEvent.setup();
    render(<ArchiveTable data={DATA} page={0} pageSize={100} />);
    const box = screen.getByRole("checkbox", { name: "Select b.txt" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });

  it("should_show_native_slim_scrollbar_on_the_table_scroller", () => {
    const { container } = render(
      <ArchiveTable data={DATA} page={0} pageSize={100} />,
    );
    const scroller = container.querySelector(".scroll-slim");
    expect(scroller).toBeInTheDocument();
  });
});
