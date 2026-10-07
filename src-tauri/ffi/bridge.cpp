// Minimal open+enumerate bridge over the vendored 7-Zip engine.
// Mirrors CPP/7zip/UI/Console/List.cpp (CArchiveLink::Open_Strict, then
// per-item GetProperty) minus all console output. C++ exceptions never
// cross the C boundary (caught per call).

#include "bridge.h"

#include <stdio.h>
#include <string.h>

#include <string>
#include <utility>
#include <vector>

#include "Common/MyCom.h"
#include "Common/MyString.h"
#include "Common/IntToString.h"
#include "Common/MyVector.h"
#include "Common/StringConvert.h"
#include "Windows/PropVariant.h"
#include "Windows/PropVariantConv.h"
#include "7zip/Archive/IArchive.h"
#include "7zip/IPassword.h"
#include "7zip/PropID.h"
#include "7zip/UI/Common/DirItem.h"
#include "7zip/UI/Common/LoadCodecs.h"
#include "7zip/UI/Common/OpenArchive.h"
#include "7zip/UI/Common/PropIDUtils.h"
#include "7zip/UI/Common/SetProperties.h"
#include "7zip/UI/Common/ArchiveOpenCallback.h"

// Password-supplying open callback. No console, no prompts: a missing
// password fails the open (tracked via PasswordAsked so the caller can
// report "Enter password" like 7zz does).
class QzOpenCallback Z7_final : public IOpenCallbackUI {
  Z7_IFACE_IMP(IOpenCallbackUI)
 public:
  UString Password;
  bool PasswordIsDefined = false;
  bool PasswordAsked = false;
};

HRESULT QzOpenCallback::Open_CheckBreak() { return S_OK; }
HRESULT QzOpenCallback::Open_SetTotal(const UInt64 *, const UInt64 *) {
  return S_OK;
}
HRESULT QzOpenCallback::Open_SetCompleted(const UInt64 *, const UInt64 *) {
  return S_OK;
}
HRESULT QzOpenCallback::Open_Finished() { return S_OK; }
HRESULT QzOpenCallback::Open_CryptoGetTextPassword(BSTR *password) {
  *password = NULL;
  PasswordAsked = true;
  if (!PasswordIsDefined)
    return E_ABORT;
  return StringToBstr(Password.Ptr(), password);
};

struct QzList {
  CCodecs codecs;
  CObjectVector<COpenType> types;  // empty == all formats (no -t filter)
  CIntVector excluded;
  CArchiveLink arcLink;
  UInt32 count = 0;
  // Header snapshot (Type, Physical Size, archive props), taken at open.
  std::vector<std::pair<std::string, std::string> > headerProps;
};

static void set_err(char *errbuf, size_t errlen, const char *msg) {
  if (errbuf && errlen > 0) {
    strncpy(errbuf, msg, errlen - 1);
    errbuf[errlen - 1] = '\0';
  }
}

// Display names indexed by PROPID, generated from kPropIdToName in
// CPP/7zip/UI/Console/List.cpp (GetPropName prefers them over handler BSTR
// names, which are usually NULL). PROPID values are a stable ABI; the A/B
// tests pin the common entries on real archives.
static const char *const kQzPropNames[] = {
    "0",
    "1",
    "2",
    "Path",
    "Name",
    "Extension",
    "Folder",
    "Size",
    "Packed Size",
    "Attributes",
    "Created",
    "Accessed",
    "Modified",
    "Solid",
    "Commented",
    "Encrypted",
    "Split Before",
    "Split After",
    "Dictionary Size",
    "CRC",
    "Type",
    "Anti",
    "Method",
    "Host OS",
    "File System",
    "User",
    "Group",
    "Block",
    "Comment",
    "Position",
    "Path Prefix",
    "Folders",
    "Files",
    "Version",
    "Volume",
    "Multivolume",
    "Offset",
    "Links",
    "Blocks",
    "Volumes",
    "Time Type",
    "64-bit",
    "Big-endian",
    "CPU",
    "Physical Size",
    "Headers Size",
    "Checksum",
    "Characteristics",
    "Virtual Address",
    "ID",
    "Short Name",
    "Creator Application",
    "Sector Size",
    "Mode",
    "Symbolic Link",
    "Error",
    "Total Size",
    "Free Space",
    "Cluster Size",
    "Label",
    "Local Name",
    "Provider",
    "NT Security",
    "Alternate Stream",
    "Aux",
    "Deleted",
    "Tree",
    "SHA-1",
    "SHA-256",
    "Error Type",
    "Errors",
    "Errors",
    "Warnings",
    "Warning",
    "Streams",
    "Alternate Streams",
    "Alternate Streams Size",
    "Virtual Size",
    "Unpack Size",
    "Total Physical Size",
    "Volume Index",
    "SubType",
    "Short Comment",
    "Code Page",
    "Is not archive type",
    "Physical Size can't be detected",
    "Zeros Tail Is Allowed",
    "Tail Size",
    "Embedded Stub Size",
    "Link",
    "Hard Link",
    "iNode",
    "Stream ID",
    "Read-only",
    "Out Name",
    "Copy Link",
    "ArcFileName",
    "IsHash",
    "Metadata Changed",
    "User ID",
    "Group ID",
    "Device Major",
    "Device Minor",
    "Dev Major",
    "Dev Minor"
};
static const size_t kQzPropNamesCount =
    sizeof(kQzPropNames) / sizeof(kQzPropNames[0]);

// Mirrors GetPropName(propID, name): table name, else BSTR name, else number.
static std::string prop_display_name(PROPID propID, LPCOLESTR bstrName) {
  if ((size_t)propID < kQzPropNamesCount)
    return std::string(kQzPropNames[(size_t)propID]);
  if (bstrName && *bstrName) {
    AString a = UnicodeStringToMultiByte(UString(bstrName), CP_UTF8);
    return std::string(a.Ptr());
  }
  char tmp[16];
  ConvertUInt32ToString(propID, tmp);
  return std::string(tmp);
}

static char *dup_utf8(const UString &u) {
  AString a = UnicodeStringToMultiByte(u, CP_UTF8);
  return strdup(a.Ptr());
}

// Short display string for a property, exactly as `7zz l -slt` renders it
// (PrintPropertyPair2: ConvertPropertyToString2 at 1ns top level, empties
// omitted by the caller). Returns "" when there is nothing to print.
static std::string prop_display_string(const NWindows::NCOM::CPropVariant &prop,
                                       PROPID propID) {
  UString s;
  ConvertPropertyToString2(s, prop, propID, 9 /*levelTopLimit*/);
  if (s.IsEmpty())
    return std::string();
  AString a = UnicodeStringToMultiByte(s, CP_UTF8);
  return std::string(a.Ptr());
}

extern "C" QzList *qz_list_open(const char *path_utf8,
                                const char *password_utf8_or_null,
                                uint64_t *count_out, char *errbuf,
                                size_t errlen) {
  try {
    QzList *list = new QzList();
    if (list->codecs.Load() != S_OK) {
      delete list;
      set_err(errbuf, errlen, "Cannot load archive codecs");
      return NULL;
    }
    QzOpenCallback cb;
    if (password_utf8_or_null && password_utf8_or_null[0] != '\0') {
      MultiByteToUnicodeString2(cb.Password, AString(password_utf8_or_null),
                                CP_UTF8);
      cb.PasswordIsDefined = true;
    }
    COpenOptions options;
    options.codecs = &list->codecs;
    options.types = &list->types;
    options.excludedFormats = &list->excluded;
    options.stream = NULL;
    // The ctor leaves props uninitialized and PrepareToOpen dereferences
    // it unconditionally (console passes parsed -t props) — empty is the
    // no-filter equivalent.
    static const CObjectVector<CProperty> kNoProps;
    options.props = &kNoProps;
    MultiByteToUnicodeString2(options.filePath, AString(path_utf8), CP_UTF8);

    HRESULT hr = list->arcLink.Open_Strict(options, &cb);
    if (hr != S_OK) {
      if (cb.PasswordAsked && !cb.PasswordIsDefined) {
        delete list;
        set_err(errbuf, errlen, "Enter password");
        return NULL;
      }
      char msg[128];
      snprintf(msg, sizeof(msg), "Cannot open archive (0x%08X)",
               (unsigned)hr);
      delete list;
      set_err(errbuf, errlen, msg);
      return NULL;
    }
    // Single-arc archives only: compound/multi-volume listings print
    // several `-slt` sections that the text parser merges in ways the
    // snapshot model doesn't reproduce — those fall back to the sidecar.
    if (list->arcLink.Arcs.Size() != 1) {
      delete list;
      set_err(errbuf, errlen, "multi-part listing unsupported");
      return NULL;
    }
    const CArc &arc = list->arcLink.Arcs.Back();
    UInt32 n = 0;
    hr = arc.Archive->GetNumberOfItems(&n);
    if (hr != S_OK) {
      delete list;
      set_err(errbuf, errlen, "Cannot read archive contents");
      return NULL;
    }
    list->count = n;
    if (count_out)
      *count_out = n;
    // Header snapshot (Type, Physical Size, archive props) exactly as
    // `7zz l -slt` prints them; empties omitted like PrintPropertyPair2.
    {
      const wchar_t *t = list->codecs.GetFormatNamePtr(arc.FormatIndex);
      if (t && *t) {
        AString a = UnicodeStringToMultiByte(UString(t), CP_UTF8);
        list->headerProps.push_back(
            std::make_pair(std::string("Type"), std::string(a.Ptr())));
      }
    }
    IInArchive *archive = arc.Archive;
    {
      NWindows::NCOM::CPropVariant prop;
      if (archive->GetArchiveProperty(kpidPhySize, &prop) == S_OK) {
        std::string v = prop_display_string(prop, kpidPhySize);
        if (!v.empty())
          list->headerProps.push_back(
              std::make_pair(std::string("Physical Size"), v));
      }
    }
    {
      UInt32 numProps = 0;
      if (archive->GetNumberOfArchiveProperties(&numProps) == S_OK) {
        for (UInt32 j = 0; j < numProps; j++) {
          CMyComBSTR name;
          PROPID propID = 0;
          VARTYPE vt = 0;
          if (archive->GetArchivePropertyInfo(j, &name, &propID, &vt) != S_OK)
            continue;
          NWindows::NCOM::CPropVariant prop;
          if (archive->GetArchiveProperty(propID, &prop) != S_OK)
            continue;
          std::string v = prop_display_string(prop, propID);
          if (v.empty())
            continue;
          // Name resolution mirrors GetPropName (null BSTRs crash
          // UString's wchar ctor — seen on 7z archives).
          std::string key = prop_display_name(propID, name);
          if (key.empty())
            continue;
          list->headerProps.push_back(std::make_pair(key, v));
        }
      }
    }
    return list;
  } catch (...) {
    set_err(errbuf, errlen, "Internal listing error");
    return NULL;
  }
}

extern "C" int qz_list_entry(const QzList *list, uint64_t index,
                             char **path_out, uint64_t *size_out,
                             int *size_defined, char **modified_out,
                             int *is_dir_out, uint64_t *packed_out,
                             int *packed_defined, char **method_out,
                             int *encrypted_out, char **host_os_out) {
  if (!list || index >= list->count)
    return -1;
  // Fail-closed temporaries: any early exit below frees what was taken.
  char *p = NULL;
  char *modified = NULL;
  char *method = NULL;
  char *host_os = NULL;
  int rc = -1;
  // One GetProperty per line kind, mirroring what `7zz l -slt` prints per
  // entry block (Path/Size/Modified/Attributes plus Packed Size/Method/
  // Encrypted/Host OS for the summary).
  try {
    const CArc &arc = list->arcLink.Arcs.Back();
    IInArchive *archive = arc.Archive;
    const UInt32 i = (UInt32)index;

    NWindows::NCOM::CPropVariant prop;
    if (archive->GetProperty(i, kpidPath, &prop) != S_OK ||
        prop.vt != VT_BSTR)
      goto fail;
    UString path(prop.bstrVal);
    prop.Clear();

    UInt64 size = 0;
    bool sizeDef = false;
    if (archive->GetProperty(i, kpidSize, &prop) != S_OK)
      goto fail;
    if (prop.vt != VT_EMPTY) {
      if (!ConvertPropVariantToUInt64(prop, size))
        goto fail;
      sizeDef = true;
    }
    prop.Clear();

    if (archive->GetProperty(i, kpidMTime, &prop) != S_OK)
      goto fail;
    if (prop.vt == VT_FILETIME) {
      // Same rendering as `7zz l -slt` (PrintTime with showNS for tech
      // mode): NTFS precision by default, digit count from the entry's own
      // precision marker, no Z suffix handling.
      CArcTime at;
      at.Set_From_Prop(prop);
      int prec = kTimestampPrintLevel_NTFS;
      if (at.Prec != 0) {
        prec = at.GetNumDigits();
        if (prec < kTimestampPrintLevel_DAY)
          prec = kTimestampPrintLevel_NTFS;
      }
      char buf[64];
      ConvertUtcFileTimeToString2(at.FT, at.Ns100, buf, prec, 0);
      if (buf[0] != '\0')
        modified = strdup(buf);
    }
    prop.Clear();

    bool isDir = false;
    if (archive->GetProperty(i, kpidIsDir, &prop) != S_OK)
      goto fail;
    if (prop.vt == VT_BOOL)
      isDir = VARIANT_BOOLToBool(prop.boolVal);
    prop.Clear();

    UInt64 packed = 0;
    bool packedDef = false;
    if (archive->GetProperty(i, kpidPackSize, &prop) != S_OK)
      goto fail;
    if (prop.vt != VT_EMPTY) {
      if (!ConvertPropVariantToUInt64(prop, packed))
        goto fail;
      packedDef = true;
    }
    prop.Clear();

    if (archive->GetProperty(i, kpidMethod, &prop) != S_OK)
      goto fail;
    if (prop.vt == VT_BSTR && prop.bstrVal && *prop.bstrVal) {
      UString m(prop.bstrVal);
      AString ma = UnicodeStringToMultiByte(m, CP_UTF8);
      if (ma.Len() > 0)
        method = strdup(ma.Ptr());
    }
    prop.Clear();

    bool encrypted = false;
    if (archive->GetProperty(i, kpidEncrypted, &prop) != S_OK)
      goto fail;
    if (prop.vt == VT_BOOL)
      encrypted = VARIANT_BOOLToBool(prop.boolVal);
    prop.Clear();

    if (archive->GetProperty(i, kpidHostOS, &prop) != S_OK)
      goto fail;
    if (prop.vt == VT_BSTR && prop.bstrVal && *prop.bstrVal) {
      UString h(prop.bstrVal);
      AString ha = UnicodeStringToMultiByte(h, CP_UTF8);
      if (ha.Len() > 0)
        host_os = strdup(ha.Ptr());
    }
    prop.Clear();

    p = dup_utf8(path);
    if (!p)
      goto fail;
    *path_out = p;
    *size_out = size;
    *size_defined = sizeDef ? 1 : 0;
    *modified_out = modified;  // NULL when absent, like a missing line
    *is_dir_out = isDir ? 1 : 0;
    *packed_out = packed;
    *packed_defined = packedDef ? 1 : 0;
    *method_out = method;  // NULL == no Method line
    *encrypted_out = encrypted ? 1 : 0;
    *host_os_out = host_os;  // NULL == no Host OS line
    rc = 0;
  } catch (...) {
    rc = -1;
  }
fail:
  if (rc != 0) {
    free(p);
    free(modified);
    free(method);
    free(host_os);
  }
  return rc;
}

extern "C" int qz_archive_prop_count(const QzList *list, uint64_t *n_out) {
  if (!list || !n_out)
    return -1;
  *n_out = (uint64_t)list->headerProps.size();
  return 0;
}

extern "C" int qz_archive_prop(const QzList *list, uint64_t i, char **key_out,
                               char **val_out) {
  if (!list || !key_out || !val_out || i >= list->headerProps.size())
    return -1;
  const auto &kv = list->headerProps[(size_t)i];
  char *k = strdup(kv.first.c_str());
  char *v = strdup(kv.second.c_str());
  if (!k || !v) {
    free(k);
    free(v);
    return -1;
  }
  *key_out = k;
  *val_out = v;
  return 0;
}

extern "C" void qz_list_close(QzList *list) { delete list; }

extern "C" void qz_string_free(char *s) { free(s); }
