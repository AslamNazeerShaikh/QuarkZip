import {
  addArchive,
  calls,
  expect,
  failNextExtract,
  failNextTest,
  openedUrls,
  openViaButton,
  stubPicker,
  test,
} from "../fixtures";

const PATH = "/tmp/pack.zip";

async function openPack(app: Parameters<typeof openViaButton>[0]) {
  await addArchive(app, PATH, { count: 3 });
  await openViaButton(app, PATH);
  await expect(app.getByText("file-1.txt")).toBeVisible();
}

test("extract-all confirm shows total count and dest, cancel dismisses", async ({
  app,
}) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract all files?" });
  await expect(dialog).toContainText("All 3 files will be extracted to");
  await expect(dialog).toContainText("/tmp");
  await app.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  // Nothing was sent to the backend.
  expect((await calls(app)).extracts).toHaveLength(0);
});

test("extract-selected confirm shows selected-of-total count", async ({
  app,
}) => {
  await addArchive(app, PATH, {
    entries: [{ path: "a.txt" }, { path: "b.txt" }, { path: "c.txt" }],
  });
  await openViaButton(app, PATH);
  await app.getByRole("checkbox", { name: "Select a.txt" }).click();
  await app.getByRole("checkbox", { name: "Select c.txt" }).click();
  await app.getByRole("button", { name: "Extract Selected" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extract selected files?" }),
  ).toContainText("2 of 3 selected files");
});

test("extract-selected with nothing checked offers extract-all", async ({
  app,
}) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract Selected" }).click();
  const dialog = app.getByRole("dialog", { name: "Nothing selected" });
  await expect(dialog).toContainText("extract all 3 files instead?");
  await dialog.getByRole("button", { name: "Extract All" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("3 files extracted to");
  const seen = await calls(app);
  expect(seen.extracts).toHaveLength(1);
  expect(seen.extracts[0].files).toEqual([]);
});

test("escape cancels the confirm, backdrop never dismisses", async ({
  app,
}) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract all files?" });
  await expect(dialog).toBeVisible();
  await app.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await app.getByRole("button", { name: "Extract All" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extract all files?" }),
  ).toBeVisible();
  // Far-left edge is backdrop (dialog card is centered): documented inert,
  // so the popup survives the click — buttons or Esc only.
  await app.mouse.click(8, 300);
  await expect(
    app.getByRole("dialog", { name: "Extract all files?" }),
  ).toBeVisible();
  await app.getByRole("button", { name: "Cancel" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extract all files?" }),
  ).toHaveCount(0);
});

test("successful extract shows the completion dialog", async ({ app }) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  const done = app.getByRole("dialog", { name: "Extraction complete" });
  await expect(done).toContainText("3 files extracted to");
  await expect(done).toContainText("/tmp");
  await app.getByRole("button", { name: "OK" }).click();
  await expect(done).toHaveCount(0);

  const seen = await calls(app);
  expect(seen.extracts).toHaveLength(1);
  expect(seen.extracts[0]).toMatchObject({
    path: PATH,
    dest: "/tmp",
    files: [],
  });
});

test("extract sends only the selected in-archive paths", async ({ app }) => {
  await addArchive(app, PATH, {
    entries: [{ path: "a.txt" }, { path: "b.txt" }],
  });
  await openViaButton(app, PATH);
  await app.getByRole("checkbox", { name: "Select b.txt" }).click();
  await app.getByRole("button", { name: "Extract Selected" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("1 files extracted to");
  const seen = await calls(app);
  expect(seen.extracts[0].files).toEqual(["b.txt"]);
});

test("subfolder option extracts into dest slash name", async ({ app }) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract all files?" });
  await app
    .getByRole("checkbox", { name: "Extract into a new subfolder" })
    .click();
  // Prefilled from the archive basename (pack.zip → pack).
  await expect(app.getByLabel("Subfolder name")).toHaveValue("pack");
  await expect(dialog).toContainText("/tmp/pack");
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("/tmp/pack");
  const seen = await calls(app);
  expect(seen.extracts[0].dest).toBe("/tmp/pack");
});

test("colliding subfolder blocks proceed", async ({ app }) => {
  await openPack(app);
  await app.evaluate(() => {
    window.__e2e.state.existingPaths = ["/tmp/pack"];
  });
  await app.getByRole("button", { name: "Extract All" }).click();
  await app
    .getByRole("checkbox", { name: "Extract into a new subfolder" })
    .click();
  await expect(app.getByText("already exists here")).toBeVisible();
  await expect(app.getByRole("button", { name: "Proceed" })).toBeDisabled();
});

test("append date-time suffixes the subfolder with a preview", async ({
  app,
}) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  await app
    .getByRole("checkbox", { name: "Extract into a new subfolder" })
    .click();
  await app.getByRole("button", { name: "Append date-time" }).click();
  await expect(app.getByLabel("Subfolder name")).toHaveValue(
    /pack_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/,
  );
  await expect(app.getByRole("button", { name: "Proceed" })).toBeEnabled();
  await app.getByRole("button", { name: "Proceed" }).click();
  const seen = await calls(app);
  expect(seen.extracts[0].dest).toMatch(/\/tmp\/pack_\d{4}-\d{2}-\d{2}_/);
});

test("failed extract shows the failure dialog", async ({ app }) => {
  await openPack(app);
  await failNextExtract(app, "disk full (e2e)");
  await app.getByRole("button", { name: "Extract All" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  const failed = app.getByRole("dialog", { name: "Extraction failed" });
  await expect(failed).toContainText("disk full (e2e)");
  await expect(failed).toContainText("/tmp");
  await app.keyboard.press("Escape");
  await expect(failed).toHaveCount(0);
});

test("destination picker updates where files go", async ({ app }) => {
  await openPack(app);
  await stubPicker(app, { dir: "/home/user/out" });
  await app.getByRole("button", { name: "Choose where to extract" }).click();
  await expect(
    app.getByRole("button", { name: "Choose where to extract" }),
  ).toContainText("/home/user/out");
  await app.getByRole("button", { name: "Extract All" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  await expect(
    app.getByRole("dialog", { name: "Extraction complete" }),
  ).toContainText("/home/user/out");
  const seen = await calls(app);
  expect(seen.extracts[0].dest).toBe("/home/user/out");
});

test("cancelled destination picker keeps the old dest", async ({ app }) => {
  await openPack(app);
  await stubPicker(app, { dir: null });
  await app.getByRole("button", { name: "Choose where to extract" }).click();
  await expect(
    app.getByRole("button", { name: "Choose where to extract" }),
  ).toContainText("/tmp");
});

test("extract buttons are disabled for an empty archive", async ({ app }) => {
  await addArchive(app, "/tmp/empty.zip", { count: 0 });
  await openViaButton(app, "/tmp/empty.zip");
  await expect(
    app.getByRole("button", { name: "Extract Selected" }),
  ).toBeDisabled();
  await expect(app.getByRole("button", { name: "Extract All" })).toBeDisabled();
});

test("dialog veil is frosted glass, never a dark dim", async ({ app }) => {
  await openPack(app);
  await app.getByRole("button", { name: "Extract All" }).click();
  const dialog = app.getByRole("dialog", { name: "Extract all files?" });
  await expect(dialog).toBeVisible();
  const veil = app.locator("#qz-extract-backdrop");
  await expect(veil).toHaveClass(/qz-dialog-backdrop/);
  // No black dim anywhere behind the dialog…
  expect(await app.locator(".bg-black\\/25").count()).toBe(0);
  // …and the blur actually applies (bright wash, frosted app beneath).
  const filter = await veil.evaluate(
    (el) => getComputedStyle(el).backdropFilter,
  );
  expect(filter).not.toBe("none");
  expect(filter).toContain("blur");
  await app.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
});

test("permission denial offers privacy settings instead of failing", async ({
  app,
}) => {
  await openPack(app);
  await failNextExtract(app, "Permission denied: /tmp/pack");
  await app.getByRole("button", { name: "Extract All" }).click();
  await app.getByRole("button", { name: "Proceed" }).click();
  // Permission dialog, not the generic failure popup…
  const dialog = app.getByRole("dialog", { name: "Permission needed" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("/tmp");
  // …the Settings grant is requested through the opener…
  await dialog.getByRole("button", { name: "Open Privacy Settings" }).click();
  expect(await openedUrls(app)).toEqual([
    "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
  ]);
  // …and Cancel dismisses cleanly.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
});

test("test permission denial swaps the result for the grant dialog", async ({
  app,
}) => {
  await openPack(app);
  await failNextTest(app, "Operation not permitted");
  await app.getByRole("button", { name: "Test" }).click();
  const dialog = app.getByRole("dialog", { name: "Permission needed" });
  await expect(dialog).toBeVisible();
  // No folder picker for tests — just the grant and Cancel.
  await expect(
    dialog.getByRole("button", { name: "Choose Different Folder" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
});
