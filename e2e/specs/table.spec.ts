import {
  addArchive,
  expect,
  openViaButton,
  stubPicker,
  test,
} from "../fixtures";

const ENTRIES = [
  { path: "docs/report.pdf", size: 5000, modified: "2026-09-01 10:00:00" },
  { path: "photo.png", size: 200, modified: "2026-09-02 11:00:00" },
  { path: "notes.txt", size: 50, modified: null },
  { path: "backup", size: null, modified: null, is_folder: true },
  { path: "inner.zip", size: 9000, modified: "2026-09-03 12:00:00" },
];

async function openMixed(app: Parameters<typeof openViaButton>[0]) {
  await addArchive(app, "/tmp/mixed.zip", { entries: ENTRIES });
  await openViaButton(app, "/tmp/mixed.zip");
}

test("rows show name, type, size, modified, serial", async ({ app }) => {
  await openMixed(app);
  await expect(app.getByText("docs/report.pdf")).toBeVisible();
  await expect(app.getByText("backup")).toBeVisible();
  // Type labels derive from extension / folder flag.
  await expect(app.getByText("Folder", { exact: true })).toBeVisible();
  await expect(app.getByText("PDF", { exact: true })).toBeVisible();
  await expect(app.getByText("TXT", { exact: true })).toBeVisible();
  // IEC sizes: 5000 -> 4.9KiB, 200 -> 200B, null -> em dash.
  await expect(app.getByText("4.9KiB")).toBeVisible();
  await expect(app.getByText("200B")).toBeVisible();
  await expect(app.getByText("—").first()).toBeVisible();
  // Parsed modified stamp renders in local time (year is stable).
  await expect(app.getByText(/2026/).first()).toBeVisible();
});

test("sorting by name toggles asc then desc", async ({ app }) => {
  await openMixed(app);
  const rows = () => app.locator('div[style*="translateY"]').allTextContents();
  await app.getByRole("button", { name: "Name" }).click();
  const asc = await rows();
  expect(asc[0]).toContain("backup");
  expect(asc[1]).toContain("docs/report.pdf");
  await app.getByRole("button", { name: "Name" }).click();
  const desc = await rows();
  expect(desc[0]).toContain("photo.png");
  expect(desc.at(-1)).toContain("backup");
});

test("sorting by size orders numerically", async ({ app }) => {
  await openMixed(app);
  await app.getByRole("button", { name: "Size" }).click();
  const asc = await app.locator('div[style*="translateY"]').allTextContents();
  expect(asc[0]).toContain("backup"); // null size sorts as -1, first
  expect(asc.at(-1)).toContain("inner.zip"); // 9000, last
  await app.getByRole("button", { name: "Size" }).click();
  const desc = await app.locator('div[style*="translateY"]').allTextContents();
  expect(desc[0]).toContain("inner.zip");
});

test("single selection drives the confirm-dialog count", async ({ app }) => {
  await openMixed(app);
  const box = app.getByRole("checkbox", { name: "Select photo.png" });
  // Header checkbox shows the partial (mixed) state.
  await box.click();
  await expect(box).toBeChecked();
  await expect(
    app.getByRole("checkbox", { name: "Select all" }),
  ).toHaveAttribute("aria-checked", "mixed");
  await app.getByRole("button", { name: "Extract Selected" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extract selected files?" }),
  ).toContainText("1 of 5 selected files");
  await app.getByRole("button", { name: "Cancel" }).click();
  // Toggling again clears the selection.
  await box.click();
  await expect(box).not.toBeChecked();
  await expect(
    app.getByRole("checkbox", { name: "Select all" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("select-all header toggles every row", async ({ app }) => {
  await openMixed(app);
  const all = app.getByRole("checkbox", { name: "Select all" });
  await all.click();
  await expect(all).toBeChecked();
  await expect(
    app.getByRole("checkbox", { name: "Select notes.txt" }),
  ).toBeChecked();
  await all.click();
  await expect(all).not.toBeChecked();
  await expect(
    app.getByRole("checkbox", { name: "Select notes.txt" }),
  ).not.toBeChecked();
});

test("selection survives page changes", async ({ app }) => {
  await addArchive(app, "/tmp/big.zip", { count: 250 });
  await openViaButton(app, "/tmp/big.zip");
  await app
    .getByRole("checkbox", { name: "Select file-1.txt", exact: true })
    .click();
  await app.getByRole("button", { name: "Next page" }).click();
  await expect(app.getByText("2 / 3")).toBeVisible();
  await app.getByRole("button", { name: "Previous page" }).click();
  await expect(
    app.getByRole("checkbox", { name: "Select file-1.txt", exact: true }),
  ).toBeChecked();
});

test("opening a new archive clears selection", async ({ app }) => {
  await addArchive(app, "/tmp/a.zip", { entries: [{ path: "aaa.txt" }] });
  await addArchive(app, "/tmp/b.zip", { entries: [{ path: "bbb.txt" }] });
  await openViaButton(app, "/tmp/a.zip");
  await app.getByRole("checkbox", { name: "Select aaa.txt" }).click();
  await stubPicker(app, { file: "/tmp/b.zip" });
  await app.getByRole("button", { name: "Open new…" }).click();
  await expect(app.getByText("bbb.txt")).toBeVisible();
  await expect(
    app.getByRole("checkbox", { name: "Select all" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("archive with zero entries shows empty state and 0/0", async ({ app }) => {
  await addArchive(app, "/tmp/empty.zip", { count: 0 });
  await openViaButton(app, "/tmp/empty.zip");
  await expect(app.getByText("No entries")).toBeVisible();
  await expect(app.getByText("0 / 0")).toBeVisible();
  await expect(
    app.getByRole("button", { name: "Extract Selected" }),
  ).toBeDisabled();
});
