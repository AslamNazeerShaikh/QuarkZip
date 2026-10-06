import { addArchive, expect, openViaButton, test } from "../fixtures";

async function openBig(app: Parameters<typeof openViaButton>[0]) {
  await addArchive(app, "/tmp/big.zip", { count: 250 });
  await openViaButton(app, "/tmp/big.zip");
}

test("readout, total, and nav buttons", async ({ app }) => {
  await openBig(app);
  await expect(app.getByText("1 / 3")).toBeVisible();
  await expect(
    app.locator("footer").getByText("250", { exact: true }),
  ).toBeVisible();
  await expect(
    app.getByRole("button", { name: "Previous page" }),
  ).toBeDisabled();
  await expect(app.getByRole("button", { name: "Next page" })).toBeEnabled();

  await app.getByRole("button", { name: "Next page" }).click();
  await expect(app.getByText("2 / 3")).toBeVisible();
  await expect(app.getByText("file-101.txt", { exact: true })).toBeVisible();
  await expect(app.getByText("file-1.txt", { exact: true })).not.toBeVisible();
  await expect(
    app.getByRole("button", { name: "Previous page" }),
  ).toBeEnabled();

  await app.getByRole("button", { name: "Next page" }).click();
  await expect(app.getByText("3 / 3")).toBeVisible();
  await expect(app.getByRole("button", { name: "Next page" })).toBeDisabled();

  await app.getByRole("button", { name: "Previous page" }).click();
  await expect(app.getByText("2 / 3")).toBeVisible();
});

test("page-size menu lists every option and applies it", async ({ app }) => {
  await openBig(app);
  await app.getByRole("button", { name: "Rows per page" }).click();
  const menu = app.getByRole("listbox", { name: "Rows per page" });
  for (const label of ["100", "1,000", "5,000", "10,000", "All"]) {
    await expect(menu.getByRole("option", { name: label })).toBeVisible();
  }
  await menu.getByRole("option", { name: "1,000" }).click();
  await expect(app.getByText("1 / 1")).toBeVisible();
  // Virtualized: scroll to the bottom to mount the last rows.
  await app
    .locator(".scroll-slim")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(app.getByText("file-250.txt", { exact: true })).toBeVisible();
});

test("choosing All shows a single page", async ({ app }) => {
  await openBig(app);
  await app.getByRole("button", { name: "Rows per page" }).click();
  await app
    .getByRole("listbox", { name: "Rows per page" })
    .getByRole("option", { name: "All" })
    .click();
  await expect(app.getByText("1 / 1")).toBeVisible();
  await expect(app.getByRole("button", { name: "Next page" })).toBeDisabled();
});

test("size change resets to the first page", async ({ app }) => {
  await openBig(app);
  await app.getByRole("button", { name: "Next page" }).click();
  await expect(app.getByText("2 / 3")).toBeVisible();
  await app.getByRole("button", { name: "Rows per page" }).click();
  await app
    .getByRole("listbox", { name: "Rows per page" })
    .getByRole("option", { name: "5,000" })
    .click();
  await expect(app.getByText("1 / 1")).toBeVisible();
});

test("menu closes on Escape and outside click", async ({ app }) => {
  await openBig(app);
  const button = app.getByRole("button", { name: "Rows per page" });
  await button.click();
  await expect(
    app.getByRole("listbox", { name: "Rows per page" }),
  ).toBeVisible();
  await app.keyboard.press("Escape");
  await expect(app.getByRole("listbox", { name: "Rows per page" })).toHaveCount(
    0,
  );

  await button.click();
  await expect(
    app.getByRole("listbox", { name: "Rows per page" }),
  ).toBeVisible();
  // Clicking the table header (outside the menu) dismisses it.
  await app.getByRole("button", { name: "Name" }).click();
  await expect(app.getByRole("listbox", { name: "Rows per page" })).toHaveCount(
    0,
  );
});

test("menu opens and selects via keyboard", async ({ app }) => {
  await openBig(app);
  const button = app.getByRole("button", { name: "Rows per page" });
  await button.focus();
  await app.keyboard.press("ArrowDown");
  const menu = app.getByRole("listbox", { name: "Rows per page" });
  await expect(menu).toBeVisible();
  await app.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
});

test("current size is marked selected in the menu", async ({ app }) => {
  await openBig(app);
  await app.getByRole("button", { name: "Rows per page" }).click();
  await expect(
    app
      .getByRole("listbox", { name: "Rows per page" })
      .getByRole("option", { name: "100" }),
  ).toHaveAttribute("aria-selected", "true");
});
