// C ABI over the vendored 7-Zip engine.
//
// Opening and listing mirror CPP/7zip/UI/Console/List.cpp:
// CCodecs::Load, CArchiveLink::Open_Strict, then GetProperty per item.
// No console output, no text parsing, no child process.

#include "include/QZEngine.h"

#include <stdio.h>
#include <string.h>

#include <string>

#include "Common/MyCom.h"
#include "Common/MyString.h"
#include "Common/StringConvert.h"
#include "Windows/PropVariant.h"
#include "Windows/PropVariantConv.h"
#include "Windows/TimeUtils.h"
#include "7zip/Archive/IArchive.h"
#include "7zip/IPassword.h"
#include "7zip/PropID.h"
#include "7zip/UI/Common/ArchiveOpenCallback.h"
#include "7zip/UI/Common/LoadCodecs.h"
#include "7zip/UI/Common/OpenArchive.h"

namespace {

constexpr const char *kEngineVersion = "7-Zip 26.05";

void set_error(char *buffer, size_t length, const char *message) {
  if (buffer == nullptr || length == 0) {
    return;
  }
  strncpy(buffer, message, length - 1);
  buffer[length - 1] = '\0';
}

std::string utf8(const UString &value) {
  AString converted = UnicodeStringToMultiByte(value, CP_UTF8);
  return converted.IsEmpty() ? std::string() : std::string(converted.Ptr());
}

}  // namespace

// Supplying the password means: never prompt. A missing password aborts the
// open with E_ABORT, which the caller reports as "password required".
class QzOpenCallback final : public IOpenCallbackUI {
  Z7_IFACE_IMP(IOpenCallbackUI)

 public:
  UString password;
  bool passwordIsDefined = false;
  bool passwordAsked = false;
};

HRESULT QzOpenCallback::Open_CheckBreak() { return S_OK; }

HRESULT QzOpenCallback::Open_SetTotal(const UInt64 *, const UInt64 *) {
  return S_OK;
}

HRESULT QzOpenCallback::Open_SetCompleted(const UInt64 *, const UInt64 *) {
  return S_OK;
}

HRESULT QzOpenCallback::Open_Finished() { return S_OK; }

HRESULT QzOpenCallback::Open_CryptoGetTextPassword(BSTR *passwordOut) {
  *passwordOut = nullptr;
  passwordAsked = true;
  if (!passwordIsDefined) {
    return E_ABORT;
  }
  return StringToBstr(password.Ptr(), passwordOut);
}

struct QzSession {
  CCodecs codecs;
  CObjectVector<COpenType> types;  // empty means every registered format
  CIntVector excluded;
  CArchiveLink link;
  UInt32 count = 0;
  std::string pathBuffer;
  std::string methodBuffer;
  std::string formatBuffer;
};

namespace {

IInArchive *archiveOf(QzSession *session) {
  if (session == nullptr || session->link.Arcs.IsEmpty()) {
    return nullptr;
  }
  return session->link.Arcs.Back().Archive;
}

template <typename T>
void copyNumber(const NWindows::NCOM::CPropVariant &prop, bool *defined,
                T *value) {
  if (prop.vt == VT_EMPTY) {
    if (defined != nullptr) {
      *defined = false;
    }
    return;
  }
  UInt64 converted = 0;
  if (ConvertPropVariantToUInt64(prop, converted)) {
    *value = static_cast<T>(converted);
    if (defined != nullptr) {
      *defined = true;
    }
  }
}

}  // namespace

extern "C" const char *qz_version(void) { return kEngineVersion; }

extern "C" QzSession *qz_open(const char *path_utf8,
                              const char *password_utf8_or_null,
                              QzStatus *status_out,
                              char *err,
                              size_t err_len) {
  const auto fail = [status_out](QzStatus status, const char *message) {
    if (status_out != nullptr) {
      *status_out = status;
    }
    return message;
  };
  if (path_utf8 == nullptr || path_utf8[0] == '\0') {
    set_error(err, err_len, fail(QZ_E_INTERNAL, "No archive path"));
    return nullptr;
  }
  try {
    auto *session = new QzSession();
    if (session->codecs.Load() != S_OK) {
      delete session;
      set_error(err, err_len,
                fail(QZ_E_INTERNAL, "Cannot load archive handlers"));
      return nullptr;
    }

    QzOpenCallback callback;
    if (password_utf8_or_null != nullptr && password_utf8_or_null[0] != '\0') {
      MultiByteToUnicodeString2(callback.password,
                                AString(password_utf8_or_null), CP_UTF8);
      callback.passwordIsDefined = true;
    }

    COpenOptions options;
    options.codecs = &session->codecs;
    options.types = &session->types;
    options.excludedFormats = &session->excluded;
    options.stream = nullptr;
    static const CObjectVector<CProperty> kNoProperties;
    options.props = &kNoProperties;
    MultiByteToUnicodeString2(options.filePath, AString(path_utf8), CP_UTF8);

    const HRESULT result = session->link.Open_Strict(options, &callback);
    if (result != S_OK) {
      if (callback.passwordAsked) {
        if (!callback.passwordIsDefined) {
          delete session;
          set_error(err, err_len, fail(QZ_E_PASSWORD, "Enter password"));
          return nullptr;
        }
        delete session;
        set_error(err, err_len, fail(QZ_E_WRONG_PASSWORD, "Wrong password"));
        return nullptr;
      }
      char message[128];
      snprintf(message, sizeof(message), "Cannot open archive (0x%08X)",
               static_cast<unsigned>(result));
      delete session;
      set_error(err, err_len, fail(QZ_E_NOT_ARCHIVE, message));
      return nullptr;
    }

    IInArchive *archive = archiveOf(session);
    if (archive == nullptr) {
      delete session;
      set_error(err, err_len, fail(QZ_E_NOT_ARCHIVE, "Archive has no handler"));
      return nullptr;
    }

    UInt32 count = 0;
    if (archive->GetNumberOfItems(&count) != S_OK) {
      delete session;
      set_error(err, err_len,
                fail(QZ_E_CORRUPT, "Cannot read archive contents"));
      return nullptr;
    }
    session->count = count;

    const CArc &arc = session->link.Arcs.Back();
    const wchar_t *format = session->codecs.GetFormatNamePtr(arc.FormatIndex);
    if (format != nullptr && format[0] != 0) {
      session->formatBuffer = utf8(UString(format));
    }
    if (status_out != nullptr) {
      *status_out = QZ_OK;
    }
    return session;
  } catch (const std::exception &error) {
    set_error(err, err_len, error.what());
    if (status_out != nullptr) {
      *status_out = QZ_E_INTERNAL;
    }
    return nullptr;
  } catch (...) {
    set_error(err, err_len, "Internal engine error");
    if (status_out != nullptr) {
      *status_out = QZ_E_INTERNAL;
    }
    return nullptr;
  }
}

extern "C" uint64_t qz_entry_count(const QzSession *session) {
  return session == nullptr ? 0 : session->count;
}

extern "C" const char *qz_format_name(const QzSession *session) {
  if (session == nullptr || session->formatBuffer.empty()) {
    return nullptr;
  }
  return session->formatBuffer.c_str();
}

extern "C" uint64_t qz_archive_size(const QzSession *session) {
  if (session == nullptr) {
    return 0;
  }
  IInArchive *archive = const_cast<QzSession *>(session)->link.Arcs.IsEmpty()
                            ? nullptr
                            : session->link.Arcs.Back().Archive;
  if (archive == nullptr) {
    return 0;
  }
  NWindows::NCOM::CPropVariant prop;
  if (archive->GetArchiveProperty(kpidPhySize, &prop) != S_OK) {
    return 0;
  }
  UInt64 value = 0;
  if (!ConvertPropVariantToUInt64(prop, value)) {
    return 0;
  }
  return value;
}

extern "C" QzStatus qz_entry_at(QzSession *session,
                                uint64_t index,
                                QzEntry *out) {
  if (session == nullptr || out == nullptr) {
    return QZ_E_INTERNAL;
  }
  if (index >= session->count) {
    return QZ_E_INTERNAL;
  }
  IInArchive *archive = archiveOf(session);
  if (archive == nullptr) {
    return QZ_E_INTERNAL;
  }

  *out = QzEntry{};
  out->crc = 0;
  out->attributes = 0;

  try {
    const UInt32 item = static_cast<UInt32>(index);
    NWindows::NCOM::CPropVariant prop;

    if (archive->GetProperty(item, kpidPath, &prop) != S_OK ||
        prop.vt != VT_BSTR || prop.bstrVal == nullptr) {
      return QZ_E_CORRUPT;
    }
    const std::string path = utf8(UString(prop.bstrVal));
    prop.Clear();
    if (path.empty()) {
      return QZ_E_CORRUPT;
    }
    session->pathBuffer = path;
    out->path = session->pathBuffer.c_str();

    if (archive->GetProperty(item, kpidSize, &prop) != S_OK) {
      return QZ_E_CORRUPT;
    }
    copyNumber(prop, reinterpret_cast<bool *>(&out->size_defined), &out->size);
    prop.Clear();

    if (archive->GetProperty(item, kpidPackSize, &prop) != S_OK) {
      return QZ_E_CORRUPT;
    }
    copyNumber(prop, reinterpret_cast<bool *>(&out->packed_size_defined),
               &out->packed_size);
    prop.Clear();

    if (archive->GetProperty(item, kpidIsDir, &prop) != S_OK) {
      return QZ_E_CORRUPT;
    }
    out->is_dir =
        (prop.vt == VT_BOOL && VARIANT_BOOLToBool(prop.boolVal)) ? 1 : 0;
    prop.Clear();

    if (archive->GetProperty(item, kpidEncrypted, &prop) == S_OK &&
        prop.vt == VT_BOOL) {
      out->is_encrypted = VARIANT_BOOLToBool(prop.boolVal) ? 1 : 0;
    }
    prop.Clear();

    if (archive->GetProperty(item, kpidMTime, &prop) == S_OK &&
        prop.vt == VT_FILETIME) {
      CFiTime stamp;
      if (FILETIME_To_timespec(prop.filetime, stamp)) {
        out->modified_unix = static_cast<int64_t>(stamp.tv_sec);
      }
    }
    prop.Clear();

    if (archive->GetProperty(item, kpidCRC, &prop) == S_OK &&
        prop.vt == VT_UI4) {
      out->crc = prop.ulVal;
    }
    prop.Clear();

    if (archive->GetProperty(item, kpidAttrib, &prop) == S_OK &&
        prop.vt == VT_UI4) {
      out->attributes = prop.ulVal;
    }
    prop.Clear();

    if (archive->GetProperty(item, kpidMethod, &prop) == S_OK &&
        prop.vt == VT_BSTR && prop.bstrVal != nullptr) {
      session->methodBuffer = utf8(UString(prop.bstrVal));
      if (!session->methodBuffer.empty()) {
        out->method = session->methodBuffer.c_str();
      }
    }
    return QZ_OK;
  } catch (...) {
    return QZ_E_INTERNAL;
  }
}

extern "C" void qz_close(QzSession *session) { delete session; }
