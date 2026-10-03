import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ArchiveEntry } from "./App";
import ArchiveTable from "./ArchiveTable";

vi.mock("@tanstack/react-virtual", () => ({
  // jsdom has no layout: render every row instead of only the visible window.
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 33,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 33,
        size: 33,
        key: index,
      })),
  }),
}));

const DATA: ArchiveEntry[] = [
  { path: "b.txt", size: 200, modified: null },
  { path: "a.txt", size: 100, modified: null },
  { path: "c.txt", size: 300, modified: null },
];

describe("ArchiveTable", () => {
  it("should_render_all_rows", () => {
    render(<ArchiveTable data={DATA} />);
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("should_sort_by_name_when_header_clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<ArchiveTable data={DATA} />);
    const rows = () =>
      Array.from(
        container.querySelectorAll('div[style*="translateY"]'),
      ).map((el) => el.textContent);
    await user.click(screen.getByText("Name"));
    expect(rows()[0]).toContain("a.txt");
    await user.click(screen.getByText("Name"));
    expect(rows()[0]).toContain("c.txt");
  });

  it("should_show_empty_state_when_no_data", () => {
    render(<ArchiveTable data={[]} />);
    expect(screen.getByText("No entries")).toBeInTheDocument();
  });
});
