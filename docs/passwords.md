# Password-protected archives in QuarkZip

How encrypted archives behave, what the UI does about it, and the engine
findings behind both. All statements below are pinned by
`src-tauri/tests/zz_ffi_list.rs` against committed fixtures
(`src-tauri/tests/fixtures/locked.zip`, `locked7z.7z`).

## 1. Two encryption scopes — why some archives preview and others don't

Encryption can cover **file contents only** or **headers too**:

| Archive                                          | Scope              | List names without password?                | Read/test/extract without password?         |
| ------------------------------------------------ | ------------------ | ------------------------------------------- | ------------------------------------------- |
| Zip with encrypted files (`-tzip -p`, ZipCrypto) | contents           | **yes** — entries, sizes, dates all visible | **no** — per-file `Wrong password` failures |
| 7z with encrypted names (`-t7z -mhe=on`)         | headers + contents | **no** — 7zz cannot even open the listing   | **no**                                      |

Concretely: opening `protected-demo.zip` shows `data.csv` / `notes.txt`
right away (only the bytes are locked), while `protected-headers.7z`
reveals nothing until the password is verified. Both are "supported
formats" — the difference is inherent to the archive, not a QuarkZip
limitation. (Plain RAR notes: RAR _extraction_ also needs its password;
listing usually does not — same content-scope rule.)

## 2. What the engine actually reports (single attempt, never prompts)

| Situation                                          | Bridge error                                   |
| -------------------------------------------------- | ---------------------------------------------- |
| Header-encrypted, no password (list/extract/test)  | `Enter password`                               |
| Header-encrypted, wrong password                   | `Wrong password`                               |
| Content-encrypted, wrong/empty password (test/`x`) | `Wrong password` (ahead of per-file CRC noise) |
| Correct password (test)                            | success (silent, like the console)             |
| List on content-encrypted (any password state)     | success — full listing, no verification at all |

Two consequences shaped the implementation:

1. **Listing never verifies a password.** A correct-looking listing proves
   nothing for content-encrypted zips — only the in-process test proves
   a password. The gate therefore verifies with `test_archive`, never
   with a listing.
2. **The engine is never left to prompt.** The open/extract callbacks
   abort (`E_ABORT`) the moment a password is asked but none was
   supplied — no stdin, no hanging, no timeout. A supplied password gets
   exactly one attempt; asking mid-run that still fails means
   `Wrong password`.

Detection lives in the bridge errbuf taxonomy plus one frontend helper
— keep their marker lists in sync: `qz_open_link`/`QzExtractCb` in
`src-tauri/ffi/bridge.cpp` emit `Enter password`, `Wrong password`
(and occasionally `Headers Error` on item ops); `isPasswordError`
(`src/lib/password.ts`) matches those plus the historical console
markers `cannot open encrypted archive` and `break signaled`
(case-insensitive; engine messages are English-only).

## 3. UX flows (all in `PasswordDialog`, same modal language)

Opening (file picker or drag-drop) a header-encrypted archive fails the
listing with a password signature → the gate opens **instead of** an
error, current listing untouched. Content-encrypted zips open straight
into their listing; the gate appears later, when an operation needs bytes.

| Trigger                                | Gate mode | Accept button | After verify                                   |
| -------------------------------------- | --------- | ------------- | ---------------------------------------------- |
| Open / drop, listing fails on password | open      | Open          | loads the listing with the password            |
| Extract fails on password              | extract   | Extract       | retries the extraction (same dest + selection) |
| Overview Test fails on password        | test      | Test          | reruns the integrity test                      |

Inside the dialog: password input with show/hide peek, **Check** (disabled
while empty) verifies with live progress; a match animates a success
check and reveals the accept button; a miss shakes the input red, shows
`Wrong password — try again.`, and keeps Check/Cancel (no accept
button); non-password failures show their message instead. **Cancel**
(and Esc, except mid-check) dismisses with zero state change. Backdrop
clicks never dismiss — like every other popup. Verified passwords are
remembered per open archive (`archivePassword`, cleared on plain opens
and failures), so Test/Extract keep working on encrypted content without
re-asking. Retries that still fail show the normal single-message failure
popup — raw per-file engine lines never reach the UI for password cases.

## 4. Edge cases covered

- **N files, one error (not N):** password failures route to the gate, so
  the old `Wrong password : a … : b … : c` pile-up cannot render.
- **Cancel keeps everything:** listing, selection, destination, theme,
  language — the gate touches no app state except on accept.
- **Empty password submit:** Check stays disabled; the engine attempt
  fails fast rather than prompting.
- **Archive deleted/moved mid-flow:** verify or retry surfaces the real
  filesystem error in-dialog (check) or in the result popup (open).
- **Wrong password remembered?** Impossible by construction — only verified
  passwords are stored, and only in memory (never persisted).
- **Checksum needs no password:** it hashes the container file itself, so
  the checksum dialog never gates.
- **Header-encrypted + Test/Extract buttons:** unreachable without
  unlocking first (the listing gate comes first).
- **Language switch mid-dialog:** all strings go through `t()`, so the
  dialog re-renders in the new language instantly.

## 5. Fixtures (committed) and manual QA

- `src-tauri/tests/fixtures/locked.zip` (ZipCrypto, `secret`) —
  content scope: opens without asking, gates on Extract/Test.
- `src-tauri/tests/fixtures/locked7z.7z` (`secret`, `-mhe=on`) —
  header scope: gates immediately on open.
- Regenerate: `7zz a -tzip <out> <files> -p<pw> -mem=ZipCrypto` and
  `7zz a -t7z <out> <files> -p<pw> -mhe=on` (dev sidecar), then commit.
- Manual QA extras (local only, never committed):
  `~/Downloads/protected-demo.zip` and `~/Downloads/protected-headers.7z`
  (both `Correct123`) for the full dialog flows.
