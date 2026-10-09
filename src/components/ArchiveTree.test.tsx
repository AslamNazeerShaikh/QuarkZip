import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArchiveTree from "./ArchiveTree";

const invokeMock = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

interface Row {
  path: string;
  size: number | null;
  modified: string | null;
  is_folder: boolean;
  index: number;
}

/// In-memory archive: root has a folder + files; docs/ has two files.
/// Indices mirror enumerate order (not display order).
const FS: Record<string, Row[]> = {
  "": [
    { path: "docs", size: null, modified: null, is_folder: true, index: 0 },
    {
      path: "top.txt",
      size: 3,
      modified: null,
      is_folder: false,
      index: 3,
    },
  ],
  docs: [
    {
      path: "docs/a.txt",
      size: 1,
      modified: null,
      is_folder: false,
      index: 1,
    },
    {
      path: "docs/b.txt",
      size: 2,
      modified: null,
      is_folder: false,
      index: 2,
    },
  ],
};

function setup(selected = new Set<string>()) {
  const onSelectionChange = vi.fn();
  invokeMock.mockImplementation(
    (cmd: string, args: Record<string, unknown>) => {
      if (cmd !== "get_children") return Promise.reject(`unexpected ${cmd}`);
      const rows = FS[args.parent as string] ?? [];
      const child_counts: Record<string, number> = {};
      if (args.parent === "") child_counts["docs"] = 2;
      return Promise.resolve({ rows, total: rows.length, child_counts });
    },
  );
  render(
    <ArchiveTree
      archive="/tmp/demo.zip"
      totalEntries={4}
      selected={selected}
      onSelectionChange={onSelectionChange}
    />,
  );
  return { onSelectionChange };
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe("ArchiveTree", () => {
  it("should_load_root_children_with_folders_first", async () => {
    setup();
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "get_children",
        expect.objectContaining({ parent: "", offset: 0 }),
      ),
    );
    expect(await screen.findByText("docs")).toBeInTheDocument();
    expect(screen.getByText("top.txt")).toBeInTheDocument();
  });

  it("should_expand_a_folder_and_drop_its_chunk_on_collapse", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText("docs");
    const expand = screen.getByRole("button", { name: "Expand folder" });
    await user.click(expand);
    expect(await screen.findByText("a.txt")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith(
      "get_children",
      expect.objectContaining({ parent: "docs" }),
    );
    // Collapse drops the chunk (RAM goal): re-expanding refetches.
    await user.click(screen.getByRole("button", { name: "Collapse folder" }));
    expect(screen.queryByText("a.txt")).not.toBeInTheDocument();
    const calls = invokeMock.mock.calls.filter(
      ([, args]) => (args as Record<string, unknown>).parent === "docs",
    );
    expect(calls).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Expand folder" }));
    await screen.findByText("a.txt");
    expect(
      invokeMock.mock.calls.filter(
        ([, args]) => (args as Record<string, unknown>).parent === "docs",
      ),
    ).toHaveLength(2);
  });

  it("should_collapse_folder_checks_to_the_folder_path_only", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = setup();
    await screen.findByText("docs");
    await user.click(screen.getByRole("checkbox", { name: "Select docs" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["docs"]));
  });

  it("should_split_the_folder_when_unchecking_inside_it", async () => {
    const user = userEvent.setup();
    // Controlled harness: applies selection updates like App does.
    const seen: ReadonlySet<string>[] = [];
    function Harness() {
      const [selected, setSelected] = useState<Set<string>>(new Set(["docs"]));
      return (
        <ArchiveTree
          archive="/tmp/demo.zip"
          totalEntries={4}
          selected={selected}
          onSelectionChange={(next) => {
            seen.push(next);
            setSelected(new Set(next));
          }}
        />
      );
    }
    invokeMock.mockImplementation(
      (cmd: string, args: Record<string, unknown>) => {
        if (cmd !== "get_children") return Promise.reject(`unexpected ${cmd}`);
        const rows = FS[args.parent as string] ?? [];
        return Promise.resolve({ rows, total: rows.length });
      },
    );
    render(<Harness />);
    await screen.findByText("docs");
    await user.click(screen.getByRole("button", { name: "Expand folder" }));
    await screen.findByText("a.txt");
    // Folder shows checked (its own path selected)…
    expect(screen.getByRole("checkbox", { name: "Select docs" })).toBeChecked();
    // …and checked, the child too (covered by the folder, shown checked).
    expect(
      screen.getByRole("checkbox", { name: "Select docs/a.txt" }),
    ).toBeChecked();
    await user.click(
      screen.getByRole("checkbox", { name: "Select docs/a.txt" }),
    );
    // …unchecking a.txt narrows to the loaded sibling (folder → mixed).
    expect(seen[seen.length - 1]).toEqual(new Set(["docs/b.txt"]));
    expect(
      screen.getByRole("checkbox", { name: "Select docs" }),
    ).toHaveAttribute("aria-checked", "mixed");
  });

  it("should_page_chunks_in_place_without_accumulating", async () => {
    const user = userEvent.setup();
    invokeMock.mockImplementation(
      (cmd: string, args: Record<string, unknown>) => {
        if (cmd !== "get_children") return Promise.reject(cmd);
        // Two chunks: turning the page replaces rows, never appends.
        const first = (args.offset as number) === 0;
        return Promise.resolve({
          rows: first
            ? [
                {
                  path: "f1.txt",
                  size: 1,
                  modified: null,
                  is_folder: false,
                  index: 0,
                },
              ]
            : [
                {
                  path: "f2.txt",
                  size: 2,
                  modified: null,
                  is_folder: false,
                  index: 1,
                },
              ],
          total: 15000,
          child_counts: {},
        });
      },
    );
    render(
      <ArchiveTree
        archive="/tmp/big.zip"
        totalEntries={15000}
        selected={new Set()}
        onSelectionChange={() => {}}
      />,
    );
    // Pager reads 1–10,000 of 15,000; Prev starts disabled.
    const pager = await screen.findByText(/of 15,000/);
    expect(pager).toHaveTextContent("1–10,000 of 15,000");
    expect(
      screen.getByRole("button", { name: "Previous chunk" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next chunk" }));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "get_children",
        expect.objectContaining({ parent: "", offset: 10000 }),
      ),
    );
    // Replaced, not appended: the old chunk's row is gone.
    await waitFor(() =>
      expect(screen.queryByText("f1.txt")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("f2.txt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous chunk" }),
    ).toBeEnabled();
  });

  it("should_keep_a_static_header_with_no_sort_buttons", async () => {
    setup();
    await screen.findByText("docs");
    // One fixed order (folders-first, natural): headers are labels, not
    // buttons — sorting re-sorted millions of rows and froze the UI.
    expect(screen.getByText("Name").tagName).not.toBe("BUTTON");
    expect(
      screen.queryByRole("button", { name: /Name/ }),
    ).not.toBeInTheDocument();
    // Folders lead even without any toggle.
    const items = screen.getAllByRole("treeitem");
    expect(items[0]).toHaveTextContent("docs");
    expect(items[1]).toHaveTextContent("top.txt");
  });

  it("should_truncate_type_labels_with_a_full_tooltip", async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd !== "get_children") return Promise.reject(cmd);
      return Promise.resolve({
        rows: [
          {
            path: ".bin/download-msgpackr-prebuilds",
            size: 1,
            modified: null,
            is_folder: false,
            index: 0,
          },
        ],
        total: 1,
      });
    });
    render(
      <ArchiveTree
        archive="/tmp/t.zip"
        totalEntries={1}
        selected={new Set()}
        onSelectionChange={() => {}}
      />,
    );
    // Extension from the file name only — never `BIN/DOWNLOAD-…`.
    const row = await screen.findByRole("treeitem");
    const type = within(row).getByTitle("File");
    expect(type).toHaveClass("overflow-hidden");
    const label = type.querySelector("span");
    expect(label).toHaveClass("truncate");
    expect(label?.textContent).toBe("File");
  });

  it("should_walk_with_the_keyboard", async () => {
    const user = userEvent.setup();
    const { onSelectionChange } = setup();
    await screen.findByText("docs");
    const scroller = screen.getByRole("tree");
    // ArrowDown from nothing lands on the first row and focuses it.
    // (waitFor: parallel workers can defer React's effect flush.)
    scroller.focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-0"),
    );
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-1"),
    );
    // ArrowUp walks back; Home/End jump.
    await user.keyboard("{ArrowUp}");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-0"),
    );
    await user.keyboard("{End}");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-1"),
    );
    await user.keyboard("{Home}");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-0"),
    );
    // Right expands the folder, Left collapses it again.
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("a.txt")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByText("a.txt")).not.toBeInTheDocument();
    // Space toggles the focused checkbox.
    await user.keyboard(" ");
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["docs"]));
  });

  it("should_typeahead_to_matching_names", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText("docs");
    screen.getByRole("tree").focus();
    await user.keyboard("t");
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("qz-tree-row-1"),
    );
  });

  it("should_render_skeleton_rows_while_a_folder_loads", async () => {
    let release!: (v: unknown) => void;
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd !== "get_children") return Promise.reject(cmd);
      return new Promise((resolve) => {
        release = resolve as (v: unknown) => void;
      });
    });
    render(
      <ArchiveTree
        archive="/tmp/t.zip"
        totalEntries={2}
        selected={new Set()}
        onSelectionChange={() => {}}
      />,
    );
    // Bounded shimmer placeholders (never real data) while root loads.
    await waitFor(() =>
      expect(document.querySelectorAll(".qz-skel").length).toBeGreaterThan(0),
    );
    expect(document.querySelectorAll(".qz-skel").length).toBeLessThanOrEqual(
      18,
    );
    release({ rows: [], total: 0 });
  });

  it("should_show_child_counts_on_expanded_folders", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText("docs");
    await user.click(screen.getByRole("button", { name: "Expand folder" }));
    await screen.findByText("a.txt");
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("should_draw_unicode_guides_with_room_around_the_chevron", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText("docs");
    // Root gutter: elbow only, in faint monospace text.
    const rootRow = screen.getByText("docs").closest("[role='treeitem']")!;
    expect(rootRow.textContent).toMatch(/[├└]── /);
    const chevron = screen.getByRole("button", { name: "Expand folder" });
    // 24px hit box around the 14px glyph — no more crowding the icon.
    expect(chevron).toHaveClass("w-6");
    await user.click(chevron);
    const childRow = (await screen.findByText("a.txt")).closest(
      "[role='treeitem']",
    )!;
    // Nested level: parent continuation line + own elbow (a.txt has a
    // next sibling, so ├──).
    expect(childRow.textContent).toMatch(/│ {3}├── /);
  });
});
