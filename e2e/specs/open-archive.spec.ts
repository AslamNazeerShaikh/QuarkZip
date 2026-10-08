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
  // No archive-dependent actions yet (Open lives in the titlebar now,
  // and only once an archive is open).
  await expect(
    app.getByRole("button", { name: "Extract Selected" }),
  ).not.toBeVisible();
  await expect(
    app.getByRole("button", { name: "Extract All" }),
  ).not.toBeVisible();
  await expect(
    app.getByRole("button", { name: "Open new…" }),
  ).not.toBeVisible();
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

test("collapsing the card keeps the row centered, expanding restores", async ({
  app,
}) => {
  // Extras present so More owns the row's left end when expanded
  // (default stub has no extras → More hidden, covered below).
  await addArchive(app, PATH, {
    count: 3,
    info: {
      container_format: "zip",
      physical_size: 1024,
      headers_size: 128,
      method: "Deflate",
      solid: "—",
      blocks: "1",
      file_count: 3,
      folder_count: 0,
      total_unpacked: 2048,
      total_packed: 1024,
      compression_ratio: 0.5,
      max_depth: 1,
      methods: ["Deflate"],
      encrypted_files: 0,
      encryption_scheme: "—",
      host_os: ["Unix"],
      container_size: 1024,
      container_modified: 1_759_623_585,
      extra: { Tail: "yes" },
    },
  });
  await openViaButton(app, PATH);
  const row = app.getByTestId("card-controls");
  await expect(row).toBeVisible();
  await expect(app.getByTestId("action-row")).toHaveClass(/justify-center/);
  // Expanded: More owns the row's left end.
  expect(
    await row.evaluate((el) => el.parentElement?.firstElementChild !== el),
  ).toBe(true);
  await app.getByRole("button", { name: "Collapse details" }).click();
  await expect(app.getByRole("button", { name: "More" })).not.toBeVisible();
  // Collapsed: the More cell unmounts, the row stays centered.
  expect(
    await row.evaluate((el) => el.parentElement?.firstElementChild === el),
  ).toBe(true);
  await expect(row.getByRole("button", { name: "Change theme" })).toBeVisible();
  await app.getByRole("button", { name: "Expand details" }).click();
  await expect(app.getByRole("button", { name: "More" })).toBeVisible();
});

test("more hides with no extras, row stays centered", async ({ app }) => {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);
  // Default stub info carries no extras — no dead toggle.
  await expect(app.getByRole("button", { name: "More" })).toHaveCount(0);
  const row = app.getByTestId("card-controls");
  expect(
    await row.evaluate((el) => el.parentElement?.firstElementChild === el),
  ).toBe(true);
});

test("collapsed card menus stay hittable (portaled, never clipped)", async ({
  app,
}) => {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);
  await app.getByRole("button", { name: "Collapse details" }).click();
  // Language menu: an in-card upward menu would be taller than the short
  // collapsed card and `overflow-hidden` would clip it into unclickable.
  await app.getByRole("button", { name: "Change language" }).click();
  const langMenu = app.getByRole("listbox", { name: "Language" });
  await expect(langMenu).toBeVisible();
  expect(
    await langMenu.evaluate((el) => el.parentElement === document.body),
  ).toBe(true);
  await langMenu.getByRole("option", { name: "हिन्दी" }).click();
  await expect(app.getByRole("button", { name: "भाषा बदलें" })).toBeVisible();
});

test("debug ids are present and unique across the live DOM", async ({
  app,
}) => {
  // Multi-page + extras: the jump input and the More button both mount.
  await addArchive(app, "/tmp/ids.zip", {
    count: 250,
    info: {
      container_format: "zip",
      physical_size: 1024,
      headers_size: 128,
      method: "Deflate",
      solid: "—",
      blocks: "1",
      file_count: 250,
      folder_count: 0,
      total_unpacked: 2048,
      total_packed: 1024,
      compression_ratio: 0.5,
      max_depth: 1,
      methods: ["Deflate"],
      encrypted_files: 0,
      encryption_scheme: "—",
      host_os: ["Unix"],
      container_size: 1024,
      container_modified: 1_759_623_585,
      extra: { Tail: "yes" },
    },
  });
  await openViaButton(app, "/tmp/ids.zip");
  // Spot-check the landmarks a debugging session reaches for first.
  for (const id of [
    "#qz-app-root",
    "#qz-titlebar-linux",
    "#qz-overview-card",
    "#qz-overview-meta-container",
    "#qz-action-row",
    "#qz-pager-jump-input",
    "#qz-action-more-btn",
    "#qz-table-row-1-path",
    "#qz-app-extract-selected",
  ]) {
    await expect(app.locator(id)).toBeVisible();
  }
  // No id may repeat: a duplicated debug id points Inspect Element at the
  // wrong call site.
  const dupes = await app.evaluate(() => {
    const counts = new Map<string, number>();
    for (const el of document.querySelectorAll("[id]")) {
      const id = (el as HTMLElement).id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  });
  expect(dupes).toEqual([]);
});
