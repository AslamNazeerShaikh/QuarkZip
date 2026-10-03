import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ArchiveEntry } from "./App";
import ArchiveTable from "./ArchiveTable";

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

  it("should_toggle_row_when_checkbox_clicked", async () => {
    const user = userEvent.setup();
    render(<ArchiveTable data={DATA} />);
    const box = screen.getByRole("checkbox", { name: "Select b.txt" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });

  it("should_select_range_on_marquee_drag", async () => {
    const { container } = render(<ArchiveTable data={DATA} />);
    const scroller = container.querySelector(".scroll-slim");
    expect(scroller).toBeInTheDocument();
    fireEvent.mouseDown(scroller!, { button: 0, clientY: 5 });
    fireEvent.mouseMove(scroller!, { button: 0, clientY: 80 });
    fireEvent.mouseUp(scroller!);
    // Rows are 36px: y 5..80 covers rows 0..2, i.e. all of DATA.
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      expect(
        screen.getByRole("checkbox", { name: `Select ${name}` }),
      ).toBeChecked();
    }
  });
});
