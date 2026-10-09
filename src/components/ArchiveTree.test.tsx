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
}

/// In-memory archive: root has a folder + files; docs/ has two files.
const FS: Record<string, Row[]> = {
  "": [
    { path: "docs", size: null, modified: null, is_folder: true },
    { path: "top.txt", size: 3, modified: null, is_folder: false },
  ],
  docs: [
    { path: "docs/a.txt", size: 1, modified: null, is_folder: false },
    { path: "docs/b.txt", size: 2, modified: null, is_folder: false },
  ],
};

function setup(selected = new Set<string>()) {
  const onSelectionChange = vi.fn();
  invokeMock.mockImplementation(
    (cmd: string, args: Record<string, unknown>) => {
      if (cmd !== "get_children") return Promise.reject(`unexpected ${cmd}`);
      const rows = FS[args.parent as string] ?? [];
      return Promise.resolve({ rows, total: rows.length });
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

  it("should_show_more_when_a_chunk_is_partial", async () => {
    const user = userEvent.setup();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd !== "get_children") return Promise.reject(cmd);
      return Promise.resolve({
        rows: [{ path: "f1.txt", size: 1, modified: null, is_folder: false }],
        total: 15000,
      });
    });
    const onSelectionChange = vi.fn();
    render(
      <ArchiveTree
        archive="/tmp/big.zip"
        totalEntries={15000}
        selected={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const more = await screen.findByRole("button", {
      name: /Show .* more/,
    });
    expect(more).toHaveTextContent("14,999 remaining");
    await user.click(more);
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "get_children",
        expect.objectContaining({ parent: "", offset: 1 }),
      ),
    );
  });

  it("should_refetch_in_the_new_order_when_sorting", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText("docs");
    invokeMock.mockClear();
    await user.click(screen.getByRole("button", { name: /Name/ }));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "get_children",
        expect.objectContaining({ sortKey: "path", sortDir: "desc" }),
      ),
    );
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
});
