import {
  addArchive,
  expect,
  expectPage,
  openViaButton,
  test,
} from "../fixtures";

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

test("large listing paginates and All collapses to one page", async ({
  app,
}) => {
  await addArchive(app, "/tmp/huge.zip", { count: 2500 });
  await openViaButton(app, "/tmp/huge.zip");
  await expectPage(app, 1, 25);
  // Virtualized: only the visible window mounts, not all 2500 rows.
  const mounted = await app.locator('div[style*="translateY"]').count();
  expect(mounted).toBeLessThan(200);

  await app.getByRole("button", { name: "Rows per page" }).click();
  await app
    .getByRole("listbox", { name: "Rows per page" })
    .getByRole("option", { name: "All" })
    .click();
  await expect(app.getByText("1 / 1")).toBeVisible();
  // Still virtualized: the full 2500 rows never mount at once.
  expect(await app.locator('div[style*="translateY"]').count()).toBeLessThan(
    200,
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

test("single-entry archive has no pagination beyond one page", async ({
  app,
}) => {
  await addArchive(app, "/tmp/one.zip", { count: 1 });
  await openViaButton(app, "/tmp/one.zip");
  await expect(app.getByText("1 / 1")).toBeVisible();
  await expect(
    app.getByRole("button", { name: "Previous page" }),
  ).toBeDisabled();
  await expect(app.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect(app.getByText("1", { exact: true }).first()).toBeVisible();
});
