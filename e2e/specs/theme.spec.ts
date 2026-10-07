import { addArchive, expect, openViaButton, test } from "../fixtures";
import type { Page } from "@playwright/test";

async function openSwitcher(app: Page) {
  await app.getByRole("button", { name: "Change theme" }).click();
}

test("system choice follows the OS scheme", async ({ app }, testInfo) => {
  const darkProject = testInfo.project.name === "chromium-dark";
  const html = app.locator("html");
  if (darkProject) {
    await expect(html).toHaveClass(/dark/);
  } else {
    await expect(html).not.toHaveClass(/dark/);
  }
  await expect(html).toHaveCSS("color-scheme", darkProject ? "dark" : "light");
});

test("explicit dark and light choices apply immediately", async ({ app }) => {
  const html = app.locator("html");
  await openSwitcher(app);
  await app.getByRole("button", { name: "Dark" }).click();
  await expect(html).toHaveClass(/dark/);

  await openSwitcher(app);
  await app.getByRole("button", { name: "Light" }).click();
  await expect(html).not.toHaveClass(/dark/);
  await expect(html).toHaveCSS("color-scheme", "light");
});

test("choice persists across reloads", async ({ app }) => {
  await openSwitcher(app);
  await app.getByRole("button", { name: "Dark" }).click();
  await expect(app.locator("html")).toHaveClass(/dark/);
  await app.reload();
  await expect(app.locator("html")).toHaveClass(/dark/);
  const stored = await app.evaluate(() =>
    window.localStorage.getItem("quarkzip-theme"),
  );
  expect(stored).toBe("dark");
});

test("active choice is pressed and control collapses", async ({ app }) => {
  await openSwitcher(app);
  await expect(app.getByRole("button", { name: "System" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await app.getByRole("button", { name: "Light" }).click();
  // Collapses back to the single icon button after choosing.
  await expect(app.getByRole("button", { name: "Change theme" })).toBeVisible();
  await openSwitcher(app);
  await expect(app.getByRole("button", { name: "Light" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("theme control keeps working with an archive open", async ({ app }) => {
  await addArchive(app, "/tmp/t.zip", { count: 1 });
  await openViaButton(app, "/tmp/t.zip");
  await expect(app.getByText("file-1.txt")).toBeVisible();
  await openSwitcher(app);
  await app.getByRole("button", { name: "Dark" }).click();
  await expect(app.locator("html")).toHaveClass(/dark/);
  // Archive content survives the theme switch.
  await expect(app.getByText("file-1.txt")).toBeVisible();
});

test("expanding theme shrinks pagination to an icon and back", async ({
  app,
}) => {
  await addArchive(app, "/tmp/t.zip", { count: 250 });
  await openViaButton(app, "/tmp/t.zip");
  await expect(app.getByText("1 / 3")).toBeVisible();
  await openSwitcher(app);
  // The full shell yields while the segment is out.
  await expect(
    app.getByRole("button", { name: /Show pagination/ }),
  ).toBeVisible();
  await expect(app.getByText("1 / 3")).not.toBeVisible();
  // Choosing minimizes the segment and restores the shell.
  await app.getByRole("button", { name: "Dark" }).click();
  await expect(app.getByRole("button", { name: "Change theme" })).toBeVisible();
  await expect(app.getByText("1 / 3")).toBeVisible();
});
