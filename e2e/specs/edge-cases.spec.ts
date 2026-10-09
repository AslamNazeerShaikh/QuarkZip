import { addArchive, expect, openViaButton, test } from "../fixtures";

test("folders, unknown types, and extensionless files label correctly", async ({
  app,
}) => {
  await addArchive(app, "/tmp/odds.zip", {
    entries: [
      { path: "src", is_folder: true },
      { path: "data.xyz", size: 10 },
      { path: "README", size: 20 },
      { path: "movie.mkv", size: 30 },
      { path: "run.sh", size: 40 },
    ],
  });
  await openViaButton(app, "/tmp/odds.zip");
  await expect(app.getByText("Folder", { exact: true })).toBeVisible();
  await expect(app.getByText("XYZ", { exact: true })).toBeVisible();
  await expect(app.getByText("File", { exact: true })).toBeVisible();
  await expect(app.getByText("MKV", { exact: true })).toBeVisible();
  await expect(app.getByText("SH", { exact: true })).toBeVisible();
});

test("unicode and special-character names render", async ({ app }) => {
  const names = [
    "résumé final.pdf",
    "日本語フォルダ",
    "emoji-🎉-file.txt",
    "spaces   and\ttabs.md",
    "a&b<c>d\"e'f.txt",
  ];
  await addArchive(app, "/tmp/uni.zip", {
    entries: names.map((path) => ({ path })),
  });
  await openViaButton(app, "/tmp/uni.zip");
  for (const name of names) {
    await expect(app.getByText(name, { exact: false }).first()).toBeVisible();
  }
});

test("very long names truncate with ellipsis instead of overflowing", async ({
  app,
}) => {
  const long = `${"a".repeat(200)}.txt`;
  await addArchive(app, "/tmp/long.zip", { entries: [{ path: long }] });
  await openViaButton(app, "/tmp/long.zip");
  const name = app.getByText(long);
  await expect(name).toBeVisible();
  await expect(name).toHaveClass(/truncate/);
  const box = await name.boundingBox();
  const row = await app
    .locator('div[style*="translateY"]')
    .first()
    .boundingBox();
  expect(box?.width).toBeLessThanOrEqual((row?.width ?? 0) + 1);
});

test("large folders chunk behind Show-more and stay virtualized", async ({
  app,
}) => {
  await addArchive(app, "/tmp/huge.zip", { count: 10500 });
  await openViaButton(app, "/tmp/huge.zip");
  await expect(app.getByText("file-1.txt")).toBeVisible();
  // Virtualized: only the visible window mounts, not all 10k rows.
  const mounted = await app.locator('div[style*="translateY"]').count();
  expect(mounted).toBeLessThan(200);

  // The 500-entry tail waits behind one Show-more row (bounded RAM).
  // Virtualized, so scroll to the bottom to reach it.
  const scroller = app.locator("#qz-tree-scroll");
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const more = app.getByRole("button", { name: /Show .* more/ });
  await expect(more).toContainText("500 remaining");
  await more.click();
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(app.getByText("file-10500.txt")).toBeVisible();
  // Still virtualized: the full 10,500 rows never mount at once.
  expect(await app.locator('div[style*="translateY"]').count()).toBeLessThan(
    200,
  );
  await expect(app.getByRole("button", { name: /Show .* more/ })).toHaveCount(
    0,
  );
});

test("archive path with spaces and quotes titles correctly", async ({
  app,
}) => {
  const path = `/tmp/my "quoted" dir/a.zip`;
  await addArchive(app, path, { count: 1 });
  await openViaButton(app, path);
  await expect(app.locator("header")).toContainText(`QuarkZip | ${path}`);
  await expect(app.getByText("file-1.txt")).toBeVisible();
});

test("rich info keeps extras behind More and respects collapse", async ({
  app,
}) => {
  await addArchive(app, "/tmp/rich.7z", {
    count: 2,
    info: {
      container_format: "7z",
      physical_size: 4096,
      headers_size: 256,
      method: "LZMA2",
      solid: "+",
      blocks: "2",
      file_count: 2,
      folder_count: 1,
      total_unpacked: 8192,
      total_packed: 4096,
      compression_ratio: 0.5,
      max_depth: 3,
      methods: ["LZMA2", "BCJ"],
      encrypted_files: 2,
      encryption_scheme: "7zAES",
      host_os: ["Windows"],
      container_size: 4096,
      container_modified: 1_759_623_585,
      extra: { Tail: "yes" },
    },
  });
  await openViaButton(app, "/tmp/rich.7z");
  await expect(app.getByText("7zAES")).toBeVisible();
  await expect(app.getByText("LZMA2 · BCJ")).toBeVisible();
  // Fixed grid up front; extras only behind More; collapse hides the
  // toggle and re-expand does not reshow the extras.
  await expect(
    app.getByRole("region", { name: "Additional details" }),
  ).toHaveCount(0);
  await app.getByRole("button", { name: "More" }).click();
  await expect(
    app.getByRole("region", { name: "Additional details" }),
  ).toContainText("yes");
  await app.getByRole("button", { name: "Collapse details" }).click();
  await expect(app.getByRole("button", { name: "More" })).toHaveCount(0);
  await app.getByRole("button", { name: "Expand details" }).click();
  await expect(app.getByRole("button", { name: "More" })).toBeVisible();
  await expect(
    app.getByRole("region", { name: "Additional details" }),
  ).toHaveCount(0);
});

test("single-entry archive shows one row and no Show-more", async ({ app }) => {
  await addArchive(app, "/tmp/one.zip", { count: 1 });
  await openViaButton(app, "/tmp/one.zip");
  await expect(app.getByText("file-1.txt")).toBeVisible();
  await expect(app.getByRole("button", { name: /Show .* more/ })).toHaveCount(
    0,
  );
  // Static header labels stand above the single row (no column
  // sorting — it re-sorted millions of rows and froze the UI).
  await expect(app.locator("#qz-tree-col-path")).toHaveText("Name");
  await expect(
    app.getByRole("checkbox", { name: "Select file-1.txt" }),
  ).toBeVisible();
});
