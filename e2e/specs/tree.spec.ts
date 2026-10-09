import {
  addArchive,
  calls,
  expect,
  openViaButton,
  revealedPaths,
  test,
} from "../fixtures";

const PATH = "/tmp/nested.zip";

async function openNested(app: Parameters<typeof openViaButton>[0]) {
  await addArchive(app, PATH, {
    entries: [
      { path: "docs", is_folder: true },
      { path: "docs/a.txt", size: 10 },
      { path: "docs/b.txt", size: 20 },
      { path: "top.txt", size: 5 },
    ],
  });
  await openViaButton(app, PATH);
  await expect(app.getByText("top.txt")).toBeVisible();
}

test("folders expand to children and collapse drops them", async ({ app }) => {
  await openNested(app);
  // Basenames at root; children hidden until expanded.
  await expect(app.getByText("docs", { exact: true })).toBeVisible();
  await expect(app.getByText("a.txt")).toHaveCount(0);
  await app.getByRole("button", { name: "Expand folder" }).click();
  await expect(app.getByText("a.txt")).toBeVisible();
  await expect(app.getByText("b.txt")).toBeVisible();
  // Box-drawing gutter: the nested rows carry elbows under the parent.
  const childRow = app.locator('[id$="-path"]', { hasText: "a.txt" });
  await expect(childRow).toContainText("├──");
  await app.getByRole("button", { name: "Collapse folder" }).click();
  await expect(app.getByText("a.txt")).toHaveCount(0);
});

test("checking a folder sends the folder path only", async ({ app }) => {
  await openNested(app);
  await app.getByRole("checkbox", { name: "Select docs", exact: true }).click();
  await app.getByRole("button", { name: "Extract Selected" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract selected files?" });
  await expect(dialog).toContainText("1 of 4 selected files");
  await dialog.getByRole("button", { name: "Proceed" }).click();
  const seen = await calls(app);
  expect(seen.extracts).toHaveLength(1);
  // One folder path — the backend expands it to the subtree.
  expect(seen.extracts[0].files).toEqual(["docs"]);
});

test("unchecking inside a checked folder narrows to siblings", async ({
  app,
}) => {
  await openNested(app);
  await app.getByRole("checkbox", { name: "Select docs", exact: true }).click();
  await app.getByRole("button", { name: "Expand folder" }).click();
  // Covered children show checked (inherited).
  await expect(
    app.getByRole("checkbox", { name: "Select docs/a.txt" }),
  ).toBeChecked();
  await app.getByRole("checkbox", { name: "Select docs/a.txt" }).click();
  // Folder flips to mixed; only the sibling stays selected.
  await expect(
    app.getByRole("checkbox", { name: "Select docs", exact: true }),
  ).toHaveAttribute("aria-checked", "mixed");
  await app.getByRole("button", { name: "Extract Selected" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract selected files?" });
  await expect(dialog).toContainText("1 of 4 selected files");
  await dialog.getByRole("button", { name: "Proceed" }).click();
  expect((await calls(app)).extracts[0].files).toEqual(["docs/b.txt"]);
});

test("successful extract offers Reveal in Finder", async ({ app }) => {
  await openNested(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  const done = app.getByRole("dialog", { name: "Extraction complete" });
  await expect(done).toBeVisible();
  await done.getByRole("button", { name: "Reveal in Finder" }).click();
  expect(await revealedPaths(app)).toHaveLength(1);
  await done.getByRole("button", { name: "OK" }).click();
  await expect(done).toHaveCount(0);
});

test("long type labels truncate inside their cell", async ({ app }) => {
  await addArchive(app, "/tmp/dotty.zip", {
    entries: [
      { path: ".bin/download-msgpackr-prebuilds", size: 10 },
      { path: "ok.txt", size: 1 },
    ],
  });
  await openViaButton(app, "/tmp/dotty.zip");
  // Extension from the file name: the first row reads `File`, never
  // `BIN/DOWNLOAD-…` spilling into neighbouring rows.
  await expect(app.getByText("ok.txt")).toBeVisible();
  const cells = app.locator('[id$="-type"]');
  expect(await cells.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await cells.count()); i++) {
    const over = await cells.nth(i).evaluate((el) => {
      const inner = el.querySelector("span");
      return {
        cell: el.scrollWidth - el.clientWidth,
        label: (inner?.scrollWidth ?? 0) - (inner?.clientWidth ?? 0),
      };
    });
    expect(over.cell).toBeLessThanOrEqual(1);
    expect(over.label).toBeLessThanOrEqual(1);
  }
});
