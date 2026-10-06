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

test("macOS platform hides the custom titlebar", async ({ page }) => {
  await page.goto("/?platform=macos");
  await page.evaluate(() => window.__e2e.reset());
  await expect(page.locator("header")).toHaveCount(0);
  // The app itself still works without the bar.
  await expect(page.getByText("No archive open")).toBeVisible();
});
