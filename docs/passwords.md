# Password-protected archives in QuarkZip

How encrypted archives behave, what the UI does about it, and the 7zz
findings behind both. All statements below were verified against the
pinned sidecar (7-Zip 26.03, `src-tauri/binaries/7zz-*`).

## 1. Two encryption scopes — why some archives preview and others don't

Encryption can cover **file contents only** or **headers too**:

| Archive | Scope | List names without password? | Read/test/extract without password? |
| --- | --- | --- | --- |
| Zip with encrypted files (`-tzip -p`, ZipCrypto) | contents | **yes** — entries, sizes, dates all visible | **no** — per-file `Wrong password` failures |
| 7z with encrypted names (`-t7z -mhe=on`) | headers + contents | **no** — 7zz cannot even open the listing | **no** |

Concretely: opening `protected-demo.zip` shows `data.csv` / `notes.txt`
right away (only the bytes are locked), while `protected-headers.7z`
reveals nothing until the password is verified. Both are "supported
formats" — the difference is inherent to the archive, not a QuarkZip
limitation. (Plain RAR notes: RAR *extraction* also needs its password;
listing usually does not — same content-scope rule.)

## 2. What 7zz actually reports (stdin is DEVNULL in-app)

| Situation | Exit | Output signature |
| --- | --- | --- |
| Header-encrypted, no password (`l` or `t`) | 255 | `Enter password:` then `Break signaled` |
| Header-encrypted, wrong password | 2 | `Cannot open encrypted archive. Wrong password?` + `Headers Error` |
| Content-encrypted, wrong/empty password (`t`/`x`) | 2 | `ERROR: Wrong password : <file>` **once per encrypted file** |
| Correct password (`t`) | 0 | `Everything is Ok` |
| `l` on content-encrypted (any password state) | 0 | full listing, no verification at all |

Two consequences shaped the implementation:

1. **`l` never verifies a password.** A correct-looking listing proves
   nothing for content-encrypted zips — only `7zz t` proves a password.
   The gate therefore verifies with `test_archive`, never with a listing.
2. **7zz must never be left without a `-p`.** The shell plugin spawns 7zz
   with stdin piped and never closes it, so a password *prompt* blocks
   until the 60s timeout (once misreported as a Gatekeeper issue). Every
   argv builder (`list/test/extract`) always appends `-p` — empty when no
   password is known. Empty `-p` fails fast with the signatures above and
   is ignored for plain archives and non-archives (no false positives:
   `Cannot open the file as archive` matches none of the markers).

Detection lives in two mirrored helpers — keep their marker lists in
sync: `archive::is_password_output` (Rust) and `isPasswordError`
(`src/password.ts`). Markers: `wrong password`, `enter password`,
`cannot open encrypted archive`, `headers error`, `break signaled`
(case-insensitive; 7zz messages are English-only).

## 3. UX flows (all in `PasswordDialog`, same modal language)

Opening (file picker or drag-drop) a header-encrypted archive fails the
listing with a password signature → the gate opens **instead of** an
error, current listing untouched. Content-encrypted zips open straight
into their listing; the gate appears later, when an operation needs bytes.

| Trigger | Gate mode | Accept button | After verify |
| --- | --- | --- | --- |
| Open / drop, listing fails on password | open | Open | loads the listing with the password |
| Extract fails on password | extract | Extract | retries the extraction (same dest + selection) |
| Overview Test fails on password | test | Test | reruns the integrity test |

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
popup — raw per-file 7zz lines never reach the UI for password cases.

## 4. Edge cases covered

* **N files, one error (not N):** password failures route to the gate, so
  the old `Wrong password : a … : b … : c` pile-up cannot render.
* **Cancel keeps everything:** listing, selection, destination, theme,
  language — the gate touches no app state except on accept.
* **Empty password submit:** Check stays disabled; empty `-p` at the 7zz
  layer fails fast rather than prompting.
* **Archive deleted/moved mid-flow:** verify or retry surfaces the real
  filesystem error in-dialog (check) or in the result popup (open).
* **Wrong password remembered?** Impossible by construction — only verified
  passwords are stored, and only in memory (never persisted).
* **Checksum needs no password:** it hashes the container file itself, so
  the checksum dialog never gates.
* **Header-encrypted + Test/Extract buttons:** unreachable without
  unlocking first (the listing gate comes first).
* **Language switch mid-dialog:** all strings go through `t()`, so the
  dialog re-renders in the new language instantly.

## 5. Manual QA fixtures (local only, never committed)

* `~/Downloads/protected-demo.zip` (password `Correct123`) — content scope:
  opens without asking, gates on Extract/Test.
* `~/Downloads/protected-headers.7z` (password `Correct123`, `-mhe=on`) —
  header scope: gates immediately on open.
* Recreate: `7zz a -tzip <out> <files> -p<pw>` and
  `7zz a -t7z <out> <files> -p<pw> -mhe=on`.
