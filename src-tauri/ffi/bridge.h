// C ABI over the vendored 7-Zip engine (see docs/7zip-reference.md §6).
//
// Open/listing (P1) plus extract/test, all in-process — no sidecar.
// Archives open by content sniffing (all registered formats, like `7zz`
// with no -t filter) and entries are pulled one by one. The caller (Rust)
// owns progress + cancel for listing: enumerate in batches and stop
// calling; the open call itself is one blocking C++ call (no mid-open
// abort — central-directory parse of huge archives takes seconds).
// Extract/test run synchronously in the caller's blocking thread;
// progress arrives through the QzProgressCb callback.
//
// Threading: one handle per thread, never shared. Matches the engine's
// per-handle model (MacPacker's SevenZipArchive).

#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct QzList QzList;

// Open `path_utf8` for listing. `password_utf8_or_null` unlocks
// header-encrypted archives (single attempt, like `7zz l -p`).
// On success returns a handle and fills `count_out` (total entries).
// On failure returns NULL with a message in `errbuf` (always
// NUL-terminated when errlen > 0). The message "Enter password" (no
// password given, header encrypted) matches the 7zz prompt text the
// frontend password gate already detects.
QzList *qz_list_open(const char *path_utf8, const char *password_utf8_or_null,
                     uint64_t *count_out, char *errbuf, size_t errlen);

// Pull entry `index` (0-based, < count). `path_out` is malloc'd UTF-8
// (lossy-converted like the -slt text path); `modified_out` is malloc'd
// "YYYY-MM-DD HH:MM:SS[.frac]" local time exactly as `7zz l -slt` prints
// it, or NULL when the entry carries no timestamp (like a missing line);
// same for `method_out` / `host_os_out`. `packed_out` mirrors "Packed
// Size" (absent → defined 0). Free strings with qz_string_free.
// Returns 0 on success, nonzero on failure.
int qz_list_entry(const QzList *list, uint64_t index, char **path_out,
                  uint64_t *size_out, int *size_defined,
                  char **modified_out, int *is_dir_out,
                  uint64_t *packed_out, int *packed_defined,
                  char **method_out, int *encrypted_out, char **host_os_out);

// Header snapshot: container pairs exactly as `7zz l -slt` prints them
// ("Type", "Physical Size", archive properties; empties omitted).
// Call after open, before close. Single-arc archives only.
int qz_archive_prop_count(const QzList *list, uint64_t *n_out);
int qz_archive_prop(const QzList *list, uint64_t i, char **key_out,
                    char **val_out);

void qz_list_close(QzList *list);
void qz_string_free(char *s);

// File-completion callback for qz_test (NULL = no progress): whole-file
// counts, called when the whole percent changes. `ctx` is opaque.
typedef void (*QzProgressCb)(void *ctx, uint64_t done_files,
                             uint64_t total_files);

// Extract the selection to `dest_utf8` (created with parents, like
// `7zz x -o<dest> -y`: overwrite always, no prompts). `sel_paths` holds
// exact in-archive paths (`sel_count` of them); NULL/0 extracts
// everything. A selected folder also matches everything under "folder/".
// Unsafe entries (absolute paths, ".." escapes) are skipped, never
// written outside `dest_utf8`.
// Returns 0 with `files_out` = files written. Errors in `errbuf`:
// "Enter password" (header-encrypted, none given), "Wrong password"
// (a password was asked and the run failed — both match the frontend
// password gate), per-file engine failures ("CRC Failed : <path>" and
// friends, same wording as the console), filesystem failures
// ("Permission denied: <path>", "No such file or directory: <path>"),
// "Cannot open archive (0x…)" otherwise.
int qz_extract(const char *archive_utf8, const char *password_utf8_or_null,
               const char *dest_utf8, const char **sel_paths, size_t sel_count,
               uint64_t *files_out, char *errbuf, size_t errlen);

// Test whole-archive integrity (like `7zz t`: data errors surface per
// file, success is silent). Same error taxonomy as qz_extract (no dest).
int qz_test(const char *archive_utf8, const char *password_utf8_or_null,
            QzProgressCb progress_or_null, void *progress_ctx, char *errbuf,
            size_t errlen);

#ifdef __cplusplus
}
#endif
