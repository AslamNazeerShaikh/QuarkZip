// C ABI over the vendored 7-Zip engine (see docs/7zip-reference.md §6).
//
// List-only for P1: open an archive by content sniffing (all registered
// formats, like `7zz l` with no -t filter) and pull entries one by one.
// The caller (Rust) owns progress + cancel: enumerate in batches and stop
// calling; the open call itself is one blocking C++ call (no mid-open
// abort in P1 — central-directory parse of huge archives takes seconds).
//
// Threading: one QzList per thread, never shared. Matches the engine's
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

#ifdef __cplusplus
}
#endif
