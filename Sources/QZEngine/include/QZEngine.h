#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* QuarkZip engine ABI.
 *
 * One QzSession is opened, read, and closed by one thread at a time. Calls
 * never throw across this boundary. Strings returned inside QzEntry point at
 * session-owned buffers and stay valid until the next qz_entry_at call or
 * qz_close.
 */

typedef struct QzSession QzSession;

typedef enum QzStatus {
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

typedef struct QzEntry {
  const char *path;       /* normalized UTF-8, may be NULL on error */
  const char *method;     /* UTF-8, may be NULL */
  uint64_t size;
  uint64_t packed_size;
  int64_t modified_unix;  /* seconds since epoch, 0 when absent */
  uint32_t crc;           /* 0 when absent */
  uint32_t attributes;
  uint8_t is_dir;
  uint8_t is_encrypted;
  uint8_t size_defined;
  uint8_t packed_size_defined;
} QzEntry;

/* Engine and ABI version, for About and diagnostics. */
const char *qz_version(void);

/* Open an archive by content. Returns NULL on failure, writes the reason
 * into status_out when it is not NULL, and a NUL-terminated message into
 * err when err_len > 0. */
QzSession *qz_open(const char *path_utf8,
                   const char *password_utf8_or_null,
                   QzStatus *status_out,
                   char *err,
                   size_t err_len);

uint64_t qz_entry_count(const QzSession *session);

/* Fill one entry. Returns QZ_OK or a QzStatus error. */
QzStatus qz_entry_at(QzSession *session, uint64_t index, QzEntry *out);

/* Human-readable handler name, for example "7z" or "Zip". */
const char *qz_format_name(const QzSession *session);

/* Physical archive size in bytes, 0 when the handler does not report it. */
uint64_t qz_archive_size(const QzSession *session);

void qz_close(QzSession *session);

#ifdef __cplusplus
}
#endif
