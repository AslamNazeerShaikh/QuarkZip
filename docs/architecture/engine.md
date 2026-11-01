# Engine

Status: milestone 0. The C ABI below is the agreed contract; the first
implementation covers open, list, close, and extract.

## What is vendored

- Upstream: 7-Zip 26.05 from https://github.com/ip7z/7zip, tag `26.05`,
  released 2026-10-21, downloaded as the GitHub tag archive.
- Archive: `26.05.tar.gz` from the GitHub tag
- SHA-256: `989c658cef4c13124ed1f4ff7330a6ce5ab22cefdbbc9daae9b2c110dde9a63b`
- Location: `vendor/7zip/`, unmodified.
- Build: SwiftPM target `QZEngine` compiles the same source set as upstream's
  `Alone2` static console build, minus the console front end.

The upstream tree stays byte-identical. An edit-deny rule in
`.opencode/opencode.json` blocks changes. `Scripts/verify-vendor.sh` compares
the tree against the published hash.

## Why in process

- No sidecar binary to sign, notarize, or keep in sync.
- No shell parsing, no quoting bugs, no PATH surprises.
- No IPC copy tax on multi-gigabyte archives.
- One crash domain and one code signature.
- The app can call the C++ interfaces directly instead of parsing console
  text.

This is why the old sidecar approach is gone for good.

## Compilation

The target compiles:

- `vendor/7zip/C/*.c` (top level only; `C/Util` holds demo mains).
- `vendor/7zip/CPP/7zip/Archive/**` recursively, minus `ArchiveExports.cpp`
  (DLL registry) and `DllExports*.cpp` (Windows entry points).
- `vendor/7zip/CPP/7zip/Compress/**`, `Crypto/**`, `Common/**`.
- `vendor/7zip/CPP/Common/**`.
- A fixed list of `vendor/7zip/CPP/Windows/*.cpp` shims: FileDir, FileFind,
  FileIO, FileName, PropVariant, PropVariantConv, PropVariantUtils, System,
  TimeUtils, ErrorMsg, FileLink, SystemInfo, Synchronization.
- `vendor/7zip/CPP/7zip/UI/Common/` only: LoadCodecs, OpenArchive,
  DefaultName, SetProperties, ArchiveOpenCallback, ArchiveExtractCallback,
  ExtractingFilePath, PropIDUtils.
- `Sources/QZEngine/Bridge.cpp` and `Sources/QZEngine/KeepAlive.cpp`.

Flags: `_FILE_OFFSET_BITS=64`, `_LARGEFILE_SOURCE`, `_REENTRANT`, `NDEBUG`,
`-fPIC`, C++17, libc++. No assembly. Pure C fallbacks for every codec.

`KeepAlive.cpp` references one symbol per archive handler so the linker never
drops a registrar. Without it, every format opens as "not an archive".

SwiftPM links every object of the target into the executable. There is no
static archive to force-load.

## C ABI

The header is `Sources/QZEngine/include/QZEngine.h`. Swift imports the module
as `QZEngine`.

```c
typedef struct QzSession QzSession;

typedef enum {
  QZ_OK = 0,
  QZ_E_NOT_ARCHIVE = 1,
  QZ_E_PASSWORD = 2,
  QZ_E_WRONG_PASSWORD = 3,
  QZ_E_CORRUPT = 4,
  QZ_E_UNSUPPORTED = 5,
  QZ_E_UNSAFE_PATH = 6,
  QZ_E_IO = 7,
  QZ_E_CANCELLED = 8,
  QZ_E_INTERNAL = 9
} QzStatus;

typedef struct {
  const char *path;        /* UTF-8, owned by the call, valid until next call */
  uint64_t size;
  uint64_t packed_size;
  int64_t  modified_unix;  /* seconds, 0 when absent */
  uint32_t crc;            /* 0 when absent */
  uint32_t attributes;
  uint8_t  is_dir;
  uint8_t  is_encrypted;
  const char *method;      /* UTF-8, may be NULL */
} QzEntry;

QzSession *qz_open(const char *path, const char *password,
                   char *err, size_t err_len);

uint64_t qz_entry_count(const QzSession *s);

/* Pull one entry. Strings live until qz_close or the next call on the same
   session. Returns QZ_OK, QZ_E_CANCELLED, or QZ_E_INTERNAL. */
QzStatus qz_entry_at(const QzSession *s, uint64_t index, QzEntry *out);

typedef void (*QzProgressFn)(void *ctx, uint64_t done, uint64_t total);

QzStatus qz_extract(QzSession *s,
                    const uint64_t *indices, size_t index_count,
                    const char *dest_dir,
                    QzProgressFn progress, void *ctx,
                    char *err, size_t err_len);

QzStatus qz_create(const char *dest_path, const char *format,
                   const char *const *sources, size_t source_count,
                   int level, const char *password,
                   QzProgressFn progress, void *ctx,
                   char *err, size_t err_len);

QzStatus qz_test(QzSession *s, QzProgressFn progress, void *ctx,
                 char *err, size_t err_len);

void qz_cancel(QzSession *s);
void qz_close(QzSession *s);
```

Rules:

- `qz_open` returns `NULL` on failure and always writes a NUL-terminated
  message when `err_len > 0`.
- `qz_entry_at` reuses session-owned buffers. Swift copies immediately.
- `qz_extract` with `indices == NULL` extracts everything. Indices are
  zero-based entry positions from the current listing.
- `qz_create` writes `dest_path` atomically through a sibling temp file.
- `qz_cancel` may be called from any thread. It only sets an atomic flag.
- `qz_close` waits for the worker if a call is in flight, then frees the
  handle. The caller must not close while another thread uses it.

## Opening strategy

1. Try the handler for the file extension, if one is registered.
2. If it fails or no extension matches, try the content signature.
3. If the archive is multi-volume, open the first volume; 7-Zip resolves the
   rest by name.
4. Header-encrypted archives return `QZ_E_PASSWORD` with "Enter password" in
   the message. Data-encrypted archives open, and extraction returns
   `QZ_E_PASSWORD` or `QZ_E_WRONG_PASSWORD`.

Nested archives are not opened by the engine directly. The kit extracts the
single entry to the session cache and opens the copy. This keeps the engine
contract simple and the temp file lifecycle explicit.

## Listing

- Enumerate with `GetProperty` per item. No console text parsing.
- The bridge exposes one entry per call so Swift can pull in batches and
  cancel between batches.
- Property names are stable PROPID values from `PropID.h`, not handler BSTRs.
- Dates are converted to Unix seconds in the bridge. The kit formats them for
  display.

## Extraction safety

Before a write, the bridge checks each entry:

1. Reject empty paths, absolute paths, drive letters, and NUL bytes.
2. Split on `/` and reject `.` and `..`.
3. Join with the destination and resolve symlinks.
4. Require the resolved path to stay under the resolved destination.
5. Create directories with `0755`, files with `0644` minus umask, never
   following symlinks (`O_NOFOLLOW`).
6. If a component exists as a symlink, skip the entry and report
   `QZ_E_UNSAFE_PATH`.

The kit repeats the lexical check so the UI can show skipped paths before the
job starts. Defense in depth, with the engine as the authority.

## Progress and cancellation

- Listing: the kit pulls 2,000 entries per batch and checks cancellation
  between batches.
- Extraction and creation: 7-Zip calls `SetTotal` and `SetCompleted` with
  byte counts. The bridge forwards them as `done`/`total`.
- `IArchiveExtractCallback::SetOperationResult` records per-file failures
  without aborting the run.
- Cancellation returns `E_ABORT` from `IArchiveExtractCallback` and
  `IArchiveUpdateCallback`, then the bridge returns `QZ_E_CANCELLED`.

## Memory

- One session owns its 7-Zip objects. No global state beyond the static
  handler registry.
- Path and method strings are session buffers reused per entry, not
  malloc/free per row.
- The bridge copies at most one entry's metadata at a time. Bulk entry data
  never crosses the ABI.
- Extraction streams through 7-Zip's own streams. The bridge does not buffer
  file contents.

## Testing

- `Tests/QZEngineTests` creates fixtures with the engine, then reads them
  back. It covers 7z, zip, tar, gzip, xz, bzip2, encrypted 7z and zip,
  Unicode names, empty files, and a crafted `../` entry.
- `Scripts/test-engine.sh` runs the suite with Address Sanitizer and Thread
  Sanitizer.
- `Scripts/coverage.sh --engine` reports line coverage for
  `Sources/QZEngine`.

## License

7-Zip is LGPL-2.1+ with the unRAR restriction. QuarkZip links it statically
and ships its complete corresponding source, including this bridge. QuarkZip
itself is LGPL-3.0. See `THIRD-PARTY-NOTICES.md`.
