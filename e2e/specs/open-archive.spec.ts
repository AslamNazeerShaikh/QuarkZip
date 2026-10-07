import {
  addArchive,
  calls,
  expect,
  openViaButton,
  stubPicker,
  test,
} from "../fixtures";

const PATH = "/tmp/demo.zip";

test("launch shows empty state with only theme control in footer", async ({
  app,
}) => {
  await expect(app.getByText("No archive open")).toBeVisible();
  await expect(app.getByRole("button", { name: "Open archive" })).toBeVisible();
  await expect(app.getByText("No entries")).toBeVisible();
  await expect(app.locator("header")).toContainText("QuarkZip");
  // No archive-dependent actions yet (Open lives in the titlebar now).
  await expect(
    app.getByRole("button", { name: "Extract Selected" }),
  ).not.toBeVisible();
  await expect(
    app.getByRole("button", { name: "Extract All" }),
  ).not.toBeVisible();
  await expect(app.getByRole("button", { name: "Open new…" })).toBeVisible();
  await expect(app.getByRole("button", { name: "Change theme" })).toBeVisible();
});

test("cancelled picker keeps the empty state", async ({ app }) => {
  await stubPicker(app, { file: null });
  await app.getByRole("button", { name: "Open archive" }).click();
  await expect(app.getByText("No archive open")).toBeVisible();
  await expect(app.getByText("No entries")).toBeVisible();
});

test("opening an archive lists rows, titles the window, seeds dest", async ({
  app,
}) => {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);

  await expect(app.getByText("file-1.txt", { exact: true })).toBeVisible();
  await expect(app.getByText("file-3.txt", { exact: true })).toBeVisible();
  await expect(app.locator("header")).toContainText(`"Path: ${PATH}"`);
  const seen = await calls(app);
  expect(seen.setTitle.at(-1)).toBe(`QuarkZip | "Path: ${PATH}"`);

  // Extract actions appear; dest defaults beside the archive.
  await expect(
    app.getByRole("button", { name: "Extract Selected" }),
  ).toBeEnabled();
  await expect(app.getByRole("button", { name: "Extract All" })).toBeEnabled();
  await expect(app.getByRole("button", { name: "Open new…" })).toBeVisible();
  await expect(
    app.getByRole("button", { name: "Choose where to extract" }),
  ).toContainText("/tmp");
  // Serial numbers start at 1.
  await expect(app.getByText("1", { exact: true }).first()).toBeVisible();
});

test("list failure shows an error and clears state", async ({ app }) => {
  await addArchive(app, "/tmp/broken.zip", { listError: "boom failed" });
  // Open a good archive first so there is state to clear.
  await addArchive(app, PATH, { count: 2 });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt", { exact: true })).toBeVisible();

  await stubPicker(app, { file: "/tmp/broken.zip" });
  await app.getByRole("button", { name: "Open new…" }).click();

  await expect(app.getByRole("alert")).toContainText("boom failed");
  await expect(app.getByText("No archive open")).toBeVisible();
  await expect(app.getByText("No entries")).toBeVisible();
  await expect(app.locator("header")).toContainText("QuarkZip");
  const seen = await calls(app);
  expect(seen.setTitle.at(-1)).toBe("QuarkZip");
});

test("missing info shows the details fallback", async ({ app }) => {
  await addArchive(app, PATH, { count: 1, info: null });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt", { exact: true })).toBeVisible();
  await expect(app.getByText(/Details unavailable/)).toBeVisible();
});

test("info error shows the details fallback", async ({ app }) => {
  await addArchive(app, PATH, { count: 1, infoError: "no summary" });
  await openViaButton(app, PATH);
  await expect(app.getByText(/Details unavailable/)).toBeVisible();
});

test("overview shows container and content metadata", async ({ app }) => {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);

  const container = app.getByRole("region", { name: "Container" });
  await expect(container.getByText("zip", { exact: true })).toBeVisible();
  await expect(container.getByText("Deflate", { exact: true })).toBeVisible();
  const content = app.getByRole("region", { name: "Content" });
  await expect(content.getByText("3", { exact: true }).first()).toBeVisible();
  // Ratio is textual only — no progressbar in the info card.
  await expect(content.getByText(/50\.0% of original/)).toBeVisible();
  await expect(content.getByRole("progressbar")).toHaveCount(0);
});

test("open new switches archives", async ({ app }) => {
  await addArchive(app, "/tmp/a.zip", {
    entries: [{ path: "aaa.txt" }],
  });
  await addArchive(app, "/tmp/b.zip", {
    entries: [{ path: "bbb.txt" }],
  });
  await openViaButton(app, "/tmp/a.zip");
  await expect(app.getByText("aaa.txt")).toBeVisible();

  await stubPicker(app, { file: "/tmp/b.zip" });
  await app.getByRole("button", { name: "Open new…" }).click();

  await expect(app.getByText("bbb.txt")).toBeVisible();
  await expect(app.getByText("aaa.txt")).not.toBeVisible();
  await expect(app.locator("header")).toContainText('"Path: /tmp/b.zip"');
});
