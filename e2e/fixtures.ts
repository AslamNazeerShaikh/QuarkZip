/// Shared Playwright fixtures: every test starts on a fresh app with a
/// reset fake backend. `window.__e2e` (see e2e/mocks/backend.ts) drives
/// scenarios from the spec side.
import { test as base, type Page } from "@playwright/test";

export interface E2ECalls {
  setTitle: string[];
  minimize: number;
  toggleMaximize: number;
  close: number;
  dragWindow: number;
  extracts: Array<{ path: string; dest: string; files: string[] }>;
}

async function e2e(page: Page, expr: string): Promise<unknown> {
  return page.evaluate(
    (src) =>
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      new Function(`return (${src})`)(),
    expr,
  );
}

export const test = base.extend<{
  /** The page, already loaded with backend state reset. */
  app: Page;
}>({
  app: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await page.evaluate(() => window.__e2e.reset());
    await use(page);
    if (errors.length > 0) {
      throw new Error(`page errors during test:\n${errors.join("\n")}`);
    }
  },
});

export { expect } from "@playwright/test";

/** Register a canned archive with `count` generic text files. */
export async function addArchive(
  page: Page,
  path: string,
  opts: {
    count?: number;
    entries?: Array<{
      path: string;
      size?: number | null;
      modified?: string | null;
      is_folder?: boolean;
    }>;
    info?: Record<string, unknown> | null;
    listError?: string;
    infoError?: string;
  } = {},
): Promise<void> {
  const { entries, ...rest } = opts;
  const normalized = {
    ...rest,
    entries: entries?.map((e) => ({
      path: e.path,
      size: e.size ?? null,
      modified: e.modified ?? null,
      is_folder: e.is_folder ?? false,
    })),
  };
  await page.evaluate(
    ({ path, opts }) => window.__e2e.addArchive(path, opts as never),
    { path, opts: normalized },
  );
}

/** Stub the next file/dir picker result (`null` = user cancelled). */
export async function stubPicker(
  page: Page,
  opts: { file?: string | null; dir?: string | null },
): Promise<void> {
  await page.evaluate(({ file, dir }) => {
    if (file !== undefined) window.__e2e.state.openFileResult = file;
    if (dir !== undefined) window.__e2e.state.openDirResult = dir;
  }, opts);
}

/** Open an archive through the real "Open archive" button. */
export async function openViaButton(page: Page, path: string): Promise<void> {
  await stubPicker(page, { file: path });
  await page.getByRole("button", { name: "Open archive" }).click();
}

/** Open an archive through a simulated OS file drop. */
export async function openViaDrop(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => window.__e2e.drop([p]), path);
}

export async function calls(page: Page): Promise<E2ECalls> {
  return (await e2e(page, "window.__e2e.state.calls")) as E2ECalls;
}

export async function failNextExtract(page: Page, message: string): Promise<void> {
  await page.evaluate(
    (m) => (window.__e2e.state.extractError = m),
    message,
  );
}
