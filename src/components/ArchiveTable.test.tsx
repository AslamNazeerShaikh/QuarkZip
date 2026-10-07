import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ArchiveEntry } from "../App";
import ArchiveTable from "./ArchiveTable";

const DATA: ArchiveEntry[] = [
  { path: "b.txt", size: 200, modified: null, is_folder: false },
  { path: "a.txt", size: 100, modified: null, is_folder: false },
  { path: "c.txt", size: 300, modified: null, is_folder: false },
];

describe("ArchiveTable", () => {
  it("should_render_all_rows", () => {
    render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
      />,
    );
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("should_ask_backend_to_sort_when_header_clicked", async () => {
    // P2: order is server-side — the header reports the key, rows render
    // in the served (already sorted) order.
    const user = userEvent.setup();
    const onSortKey = vi.fn();
    const { container, rerender } = render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={onSortKey}
        listingId="/tmp/a.zip"
      />,
    );
    const rows = () =>
      Array.from(container.querySelectorAll('div[style*="translateY"]')).map(
        (el) => el.textContent,
      );
    await user.click(screen.getByText("Name"));
    expect(onSortKey).toHaveBeenCalledWith("path");
    // Served order renders untouched (server sorted: a, b, c).
    rerender(
      <ArchiveTable
        data={[...DATA].reverse()}
        page={0}
        pageSize={100}
        sortKey="path"
        sortDir="desc"
        onSortKey={onSortKey}
        listingId="/tmp/a.zip"
      />,
    );
    expect(rows()[0]).toContain("c.txt");
  });

  it("should_keep_selection_across_pages_but_reset_per_archive", async () => {
    const user = userEvent.setup();
    const seen: ReadonlySet<string>[] = [];
    const { rerender } = render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
        onSelectionChange={(sel) => seen.push(sel)}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Select b.txt" }));
    // Page turn: same listing, selection accumulates.
    rerender(
      <ArchiveTable
        data={DATA}
        page={1}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
        onSelectionChange={(sel) => seen.push(sel)}
      />,
    );
    expect(seen[seen.length - 1]).toEqual(new Set(["b.txt"]));
    // New archive: selection clears.
    rerender(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/b.zip"
        onSelectionChange={(sel) => seen.push(sel)}
      />,
    );
    expect(seen[seen.length - 1]).toEqual(new Set());
  });

  it("should_notify_selection_when_checkbox_clicked", async () => {
    const user = userEvent.setup();
    const seen: ReadonlySet<string>[] = [];
    render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
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
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
      />,
    );
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Oct 3, 2026, 9:39:45 PM")).toBeInTheDocument();
  });

  it("should_show_empty_state_when_no_data", () => {
    render(
      <ArchiveTable
        data={[]}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
      />,
    );
    expect(screen.getByText("No entries")).toBeInTheDocument();
  });

  it("should_toggle_row_when_checkbox_clicked", async () => {
    const user = userEvent.setup();
    render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Select b.txt" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });

  it("should_show_native_slim_scrollbar_on_the_table_scroller", () => {
    const { container } = render(
      <ArchiveTable
        data={DATA}
        page={0}
        pageSize={100}
        sortKey={null}
        sortDir="asc"
        onSortKey={() => {}}
        listingId="/tmp/a.zip"
      />,
    );
    const scroller = container.querySelector(".scroll-slim");
    expect(scroller).toBeInTheDocument();
  });
});
