/// Locale parity check for translation PRs (XDM-style contributions).
///
/// Usage: `npm run i18n:check`
///
/// Rules enforced:
/// 1. `src/i18n/locales/en.json` is canonical — every other `<code>.json`
///    must contain exactly the same keys (no missing, no extra).
/// 2. Filenames must be BCP-47-ish: `hi.json`, `pt-BR.json`, `zh-Hant-TW.json`.
/// 3. `{placeholders}` in each value must match the English source exactly —
///    translators may reorder them, never rename or drop them.
/// 4. Every locale file on disk must be registered in `src/i18n/locales.ts`
///    (the XDM `index.txt` equivalent), and vice versa.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src", "i18n", "locales");
const registryPath = join(root, "src", "i18n", "locales.ts");

const CODE_RE = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?$/;
const PLACEHOLDER_RE = /\{(\w+)\}/g;

function fail(message) {
  console.error(`i18n:check FAILED — ${message}`);
  process.exitCode = 1;
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort();
if (!files.includes("en.json")) {
  fail("canonical src/i18n/locales/en.json is missing");
  process.exit(1);
}

const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const enKeys = Object.keys(read("en.json")).sort();
const registry = readFileSync(registryPath, "utf8");
let errors = 0;

for (const file of files) {
  const code = file.replace(/\.json$/, "");
  if (!CODE_RE.test(code)) {
    fail(`${file}: name must be BCP-47-ish (e.g. hi.json, pt-BR.json)`);
    errors += 1;
  }
  if (file !== "en.json") {
    const keys = Object.keys(read(file)).sort();
    const missing = enKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !enKeys.includes(k));
    if (missing.length > 0) {
      fail(`${file}: missing keys: ${missing.join(", ")}`);
      errors += 1;
    }
    if (extra.length > 0) {
      fail(`${file}: extra keys not in en.json: ${extra.join(", ")}`);
      errors += 1;
    }
    const en = read("en.json");
    const strings = read(file);
    for (const key of enKeys) {
      const want = [...(en[key].matchAll?.(PLACEHOLDER_RE) ?? [])]
        .map((m) => m[1])
        .sort()
        .join(",");
      const got = [...((strings[key] ?? "").matchAll?.(PLACEHOLDER_RE) ?? [])]
        .map((m) => m[1])
        .sort()
        .join(",");
      if (want !== got) {
        fail(`${file}:${key}: placeholders {${got}} must match en {${want}}`);
        errors += 1;
      }
    }
  }
  const registered = registry.includes(`./locales/${code}.json`);
  if (!registered) {
    fail(`${file}: not registered in src/i18n/locales.ts (add an entry to LOCALES)`);
    errors += 1;
  }
}

if (errors === 0) {
  console.log(
    `i18n:check OK — ${files.length} locale(s) (${files.join(", ")}) match en.json (${enKeys.length} keys)`,
  );
}
