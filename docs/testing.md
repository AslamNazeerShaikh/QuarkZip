# Testing and coverage

Status: the harness is being built in milestone 0. The policy is agreed.

## The pyramid

| Level | Tool | Scope | Speed |
| --- | --- | --- | --- |
| Unit | Swift Testing | `QuarkZipKit` rules, models, tree, paths, jobs | seconds |
| Engine | Swift Testing + real archives | `QZEngine` open/list/extract/create/test | seconds to a minute |
| Self-test | `QuarkZip --selftest` | The same services the UI calls, on a temp store | seconds |
| Snapshot | `Scripts/snapshot.sh` | Every page and Settings tab, light and dark | minute |
| Manual | Computer use | Drag and drop, permissions, Finder integration | minutes |

A story gets the cheapest level that can prove its acceptance criteria. A bug
fix starts with a failing test.

## Commands

```bash
./Scripts/test.sh            # swift test, all targets
./Scripts/test-unit.sh       # QuarkZipKitTests only
./Scripts/test-engine.sh     # QZEngineTests, with sanitizers
./Scripts/coverage.sh        # unit + engine coverage, fails under the gate
./Scripts/selftest.sh        # app self-test
./Scripts/snapshot.sh        # PNGs in /tmp/QuarkZip-shots
./Scripts/verify.sh          # everything except snapshots
```

## Coverage gate

Coverage is measured with `swift test --enable-code-coverage` and
`llvm-cov show` per source file. The script counts executable source lines
and ignores compiler-generated thunks, blank lines, and comments, which
`llvm-cov report` folds into its own totals. `Scripts/coverage.sh`:

1. Builds the test binary.
2. Measures every file in `Sources/QuarkZipKit`.
3. Reports covered, total, and percent per file in `coverage/summary.txt`.
4. Fails when `QuarkZipKit` is below **100%**.
5. Prints the `QZEngine` bridge numbers with `--engine`.

Excluded from the percentage:

- SwiftUI view bodies (`Sources/QuarkZip/Views/**`). They are covered by
  snapshots and the self-test, not by unit tests.
- Generated code and the `@main` entry point.
- `fatalError` and process-exit paths, only with a written reason here.

Current engine baseline: **60.48%** for `Sources/QZEngine/Bridge.cpp` at
milestone 0 (open and list only). `Guids.cpp` is linker plumbing and is not
gated. Extraction and creation raise the number in M2 and M3.

Why 100% for the kit: the kit is small, pure, and owns the decisions that
cost users data. Every branch there must be demonstrated. Views are visual;
their correctness is proven by looking at snapshots and driving the app.

## Fixtures

Created at test time in `FileManager.default.temporaryDirectory`, removed in
`defer`. No binary fixtures in git unless smaller than 1 KB and impossible to
generate.

Matrix:

| Archive | Contents | Purpose |
| --- | --- | --- |
| `plain.7z` | nested folders, Unicode names, empty file | listing, tree |
| `plain.zip` | same | listing, CRC |
| `plain.tar` | same | listing without compression |
| `plain.tar.gz` | same | codec path |
| `plain.tar.xz` | same | codec path |
| `plain.tar.bz2` | same | codec path |
| `encrypted-header.7z` | one file, AES, names encrypted | password required |
| `encrypted-data.zip` | one file, ZipCrypto and AES | password required |
| `bad-crc.zip` | one flipped byte | corruption report |
| `slip.zip` | `../escape.txt`, `/abs.txt`, symlink escape | path safety |
| `many.zip` | 100,000 small entries | performance |
| `unicode.zip` | NFC/NFD names, emoji, RTL | names |

## Unit test rules

- Use `#expect` and `#require`. Prefer table tests with
  `@Test(arguments:)` for parsers, sorting, and path rules.
- Fix the clock and the locale. Never depend on the machine's time zone.
- No sleeps. Use continuations or an injected clock.
- Tests are independent and parallel-safe.
- A test name says the behavior: `rejectsParentDirectorySegments()`, not
  `testPath()`.

## Self-test

`QuarkZip --selftest <archive>` runs the shipping binary against a throwaway
archive. `Scripts/selftest.sh` creates the archive in `/tmp` with `tar` and
runs the checks: engine version, open, format, entries, tree, a known file, a
nested folder, and formatting. No access to the real Application Support
folder.

It prints one PASS or FAIL per check and exits 1 on the first failure after
printing the summary. The checks mirror the stories: open, list, tree, sort,
safe extract, bad password, cancel, create.

## Snapshots

`Scripts/snapshot.sh` runs the shipping binary with `QUARKZIP_SNAPSHOT=1`.
The app renders the welcome page and the browser offscreen in light and dark,
writes `/tmp/QuarkZip-shots/<page>-<appearance>.png`, and quits. Set
`QUARKZIP_SNAPSHOT_ARCHIVE=<path>` to render a real archive instead of the
sample data.

Look at every image. A snapshot that exists but was never opened does not
count.

## Sanitizers

`Scripts/test-engine.sh` runs:

```bash
swift test --sanitize=address --filter QZEngineTests
swift test --sanitize=thread --filter QZEngineTests
```

The engine is not thread-safe per handle. The thread sanitizer catches shared
handle misuse and callbacks that touch Swift state off the actor.

## Continuous checks

`Scripts/verify.sh` runs in this order and stops at the first failure:

1. `swift build` with warnings as errors for our targets.
2. `swift test`.
3. `Scripts/coverage.sh`.
4. `Scripts/vendor-check.sh` (7-Zip tree hash).
5. `Scripts/token-lint.sh` (no literal colors in views).

`Scripts/grid-lint.sh` lands with the first custom layout in milestone 1.
Snapshots stay a manual step because they need eyes, not just pixels. The
script checks the files exist and have non-zero size.

## Definition of done for a story

- A test that failed before the change now passes.
- No new warnings.
- Coverage at or above the gate.
- Snapshots exist and were reviewed for UI work.
- The story in `docs/STORIES.md` is ticked with the evidence named.
