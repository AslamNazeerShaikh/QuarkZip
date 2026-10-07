import { addArchive, calls, expect, openViaButton, test } from "../fixtures";

test("window buttons call the backend and header drags", async ({ app }) => {
  const header = app.locator("header");
  await expect(header).toHaveAttribute("data-tauri-drag-region");

  await app.getByRole("button", { name: "Minimize" }).click();
  await app.getByRole("button", { name: "Maximize" }).click();
  await app.getByRole("button", { name: "Close" }).click();
  const seen = await calls(app);
  expect(seen.minimize).toBe(1);
  expect(seen.toggleMaximize).toBe(1);
  expect(seen.close).toBe(1);

  // Mousedown on the bar (away from buttons) starts a native drag.
  await app.mouse.move(200, 24);
  await app.mouse.down();
  await app.mouse.up();
  expect((await calls(app)).dragWindow).toBeGreaterThanOrEqual(1);
});

test("maximize button shows restore state when maximized", async ({ app }) => {
  const frame = app.getByTestId("app-frame");
  await expect(frame).toHaveCSS("border-radius", "20px");
  await app.getByRole("button", { name: "Maximize" }).click();
  await expect(app.getByRole("button", { name: "Restore" })).toBeVisible();
  // Maximized windows go flush: no radius or floating margin.
  await expect(frame).toHaveCSS("border-radius", "0px");
  await app.getByRole("button", { name: "Restore" }).click();
  await expect(app.getByRole("button", { name: "Maximize" })).toBeVisible();
  await expect(frame).toHaveCSS("border-radius", "20px");
});

test("opening an archive records the window title", async ({ app }) => {
  await addArchive(app, "/tmp/titled.zip", { count: 1 });
  await openViaButton(app, "/tmp/titled.zip");
  const seen = await calls(app);
  expect(seen.setTitle.at(-1)).toBe('QuarkZip | "Path: /tmp/titled.zip"');
});

test("open lives in the titlebar, left on linux", async ({ app }) => {
  // Empty state owns no Open — the card CTA does that job.
  await expect(
    app.getByRole("button", { name: "Open new…" }),
  ).not.toBeVisible();
  await addArchive(app, "/tmp/titled.zip", { count: 1 });
  await openViaButton(app, "/tmp/titled.zip");
  const header = app.locator("header");
  await expect(header.getByRole("button", { name: "Open new…" })).toBeVisible();
});

test("long paths middle-truncate, keeping the file name", async ({ app }) => {
  const path = "/very/long/directory/chain/that/keeps/going/on/forever.zip";
  await addArchive(app, path, { count: 1 });
  await openViaButton(app, path);
  await expect(app.locator("header")).toContainText("forever.zip");
});

test("macOS overlay hides open until an archive is open", async ({ page }) => {
  await page.goto("/?platform=macos");
  await page.evaluate(() => window.__e2e.reset());
  // No custom window controls there — the overlay strip owns the bar.
  await expect(page.locator("header")).toHaveCount(0);
  const bar = page.getByTestId("mac-titlebar");
  await expect(
    bar.getByRole("button", { name: "Open new…" }),
  ).not.toBeVisible();
  await expect(bar).toContainText("QuarkZip");
});

test("macOS overlay shows open on the right once open", async ({ page }) => {
  await page.goto("/?platform=macos");
  await page.evaluate(() => window.__e2e.reset());
  await page.evaluate(() =>
    window.__e2e.addArchive("/tmp/m.zip", { count: 1 }),
  );
  await page.evaluate(() => window.__e2e.drop(["/tmp/m.zip"]));
  const bar = page.getByTestId("mac-titlebar");
  await expect(bar.getByRole("button", { name: "Open new…" })).toBeVisible();
  await expect(bar).toContainText("m.zip");
});
