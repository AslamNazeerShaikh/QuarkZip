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

// ---- Extract + Test (in-process `7zz x` / `7zz t`, no sidecar) ----
// Modelled on CPP/7zip/UI/Client7z/Client7z.cpp (CArchiveExtractCallback)
// minus all console output: overwrite always (like -y), no prompts, errors
// captured into errbuf. Selection, progress and password behaviour mirror
// the sidecar contract the frontend was built against. The open sequence
// duplicates qz_list_open on purpose: listing is the busiest path and must
// not shift under an extract refactor.

#include <errno.h>

#include "7zip/Common/FileStreams.h"
#include "Windows/FileDir.h"
#include "Windows/FileFind.h"
#include "Windows/FileName.h"
#include "Windows/TimeUtils.h"

struct QzArc {
  CCodecs codecs;
  CObjectVector<COpenType> types;
  CIntVector excluded;
  CArchiveLink arcLink;
};

// Open by content sniffing (all formats). "" on success; asked_out reports
// whether a password was requested during open.
static std::string qz_open_link(QzArc &arc, const char *path_utf8,
                                const char *pw_or_null, bool &asked_out) {
  asked_out = false;
  if (arc.codecs.Load() != S_OK)
    return "Cannot load archive codecs";
  QzOpenCallback cb;
  if (pw_or_null && pw_or_null[0] != '\0') {
    MultiByteToUnicodeString2(cb.Password, AString(pw_or_null), CP_UTF8);
    cb.PasswordIsDefined = true;
  }
  COpenOptions options;
  options.codecs = &arc.codecs;
  options.types = &arc.types;
  options.excludedFormats = &arc.excluded;
  options.stream = NULL;
  static const CObjectVector<CProperty> kNoProps;
  options.props = &kNoProps;
  MultiByteToUnicodeString2(options.filePath, AString(path_utf8), CP_UTF8);
  HRESULT hr = arc.arcLink.Open_Strict(options, &cb);
  asked_out = cb.PasswordAsked;
  if (hr != S_OK) {
    if (cb.PasswordAsked)
      return cb.PasswordIsDefined ? "Wrong password" : "Enter password";
    char msg[128];
    snprintf(msg, sizeof(msg), "Cannot open archive (0x%08X)", (unsigned)hr);
    return msg;
  }
  return "";
}

// Zip-slip guard: entry paths must stay under the destination. Byte scan is
// safe: every pattern below is ASCII and UTF-8 never embeds ASCII bytes.
static bool qz_path_safe(const std::string &rel) {
  if (rel.empty())
    return false;
  if (rel[0] == '/' || rel[0] == '\\')
    return false;
  if (rel.size() >= 2 && rel[1] == ':' &&
      ((rel[0] >= 'A' && rel[0] <= 'Z') || (rel[0] >= 'a' && rel[0] <= 'z')))
    return false;
  if (rel == ".." || rel == ".")
    return false;
  if (rel.compare(0, 3, "../") == 0 || rel.compare(0, 3, "..\\") == 0)
    return false;
  if (rel.find("/../") != std::string::npos ||
      rel.find("\\..\\") != std::string::npos)
    return false;
  size_t n = rel.size();
  if ((n >= 3 && rel.compare(n - 3, 3, "/..") == 0) ||
      (n >= 3 && rel.compare(n - 3, 3, "\\..") == 0))
    return false;
  return true;
}

// errno-mapped filesystem failure for user-facing messages (the frontend
// permission dialog keys off "Permission denied").
static std::string qz_fs_error(const FString &fullPath) {
  int e = errno;
  std::string p(fullPath.Ptr());
  if (e == EACCES || e == EPERM)
    return "Permission denied: " + p;
  if (e == ENOENT)
    return "No such file or directory: " + p;
  return "Cannot write output file " + p;
}

class QzExtractCb Z7_final : public IArchiveExtractCallback,
                             public ICryptoGetTextPassword,
                             public CMyUnknownImp {
  Z7_IFACES_IMP_UNK_2(IArchiveExtractCallback, ICryptoGetTextPassword)
  Z7_IFACE_COM7_IMP(IProgress)

 public:
  CMyComPtr<IInArchive> arc;
  FString destDir;  // normalized, trailing separator
  bool testMode = true;
  bool passwordDefined = false;
  UString password;
  bool passwordAsked = false;  // op-phase asks only (own object)
  uint64_t totalFiles = 0;
  uint64_t doneFiles = 0;
  uint64_t filesWritten = 0;
  uint64_t numErrors = 0;
  std::string firstError;
  std::string opError;  // fatal GetStream-level failure
  QzProgressCb progressFn = NULL;
  void *progressCtx = NULL;
  int lastPct = -1;
  // Per-item state (valid between GetStream and SetOperationResult).
  UString curRel;
  std::string curRelUtf8;
  FString curFull;
  bool curIsFile = false;
  bool curMtDef = false;
  CFiTime curMt;
  bool curAttribDef = false;
  UInt32 curAttrib = 0;
  COutFileStream *outSpec = NULL;
  CMyComPtr<ISequentialOutStream> outFile;

  void report() {
    if (!progressFn || totalFiles == 0)
      return;
    int pct = (int)((doneFiles * 100) / totalFiles);
    if (pct != lastPct) {
      lastPct = pct;
      progressFn(progressCtx, doneFiles, totalFiles);
    }
  }
};

Z7_COM7F_IMF(QzExtractCb::SetTotal(UInt64 /* size */)) { return S_OK; }
Z7_COM7F_IMF(QzExtractCb::SetCompleted(const UInt64 * /* completeValue */)) {
  return S_OK;
}

Z7_COM7F_IMF(QzExtractCb::GetStream(UInt32 index,
                                    ISequentialOutStream **outStream,
                                    Int32 askExtractMode)) {
  *outStream = NULL;
  outFile.Release();
  outSpec = NULL;
  curIsFile = false;
  if (askExtractMode != NArchive::NExtract::NAskMode::kExtract)
    return S_OK;  // test/skip: decode only, no sink
  if (testMode)
    return S_OK;
  try {
    NWindows::NCOM::CPropVariant prop;
    if (arc->GetProperty(index, kpidPath, &prop) != S_OK ||
        prop.vt != VT_BSTR) {
      opError = "Cannot read entry name";
      return E_ABORT;
    }
    curRel = UString(prop.bstrVal);
    prop.Clear();
    {
      AString a = UnicodeStringToMultiByte(curRel, CP_UTF8);
      curRelUtf8 = std::string(a.Ptr());
    }
    bool isDir = false;
    if (arc->GetProperty(index, kpidIsDir, &prop) != S_OK) {
      opError = "Cannot read entry info";
      return E_ABORT;
    }
    if (prop.vt == VT_BOOL)
      isDir = VARIANT_BOOLToBool(prop.boolVal);
    prop.Clear();
    curMtDef = false;
    if (arc->GetProperty(index, kpidMTime, &prop) != S_OK) {
      opError = "Cannot read entry info";
      return E_ABORT;
    }
    if (prop.vt == VT_FILETIME) {
      if (!FILETIME_To_timespec(prop.filetime, curMt)) {
        opError = "Cannot read entry info";
        return E_ABORT;
      }
      curMtDef = true;
    }
    prop.Clear();
    UInt32 attrib = 0;
    curAttribDef = false;
    if (arc->GetProperty(index, kpidAttrib, &prop) == S_OK &&
        prop.vt == VT_UI4) {
      attrib = prop.ulVal;
      curAttribDef = true;
    }
    prop.Clear();
    curFull = destDir + us2fs(curRel);
    if (isDir) {
      NWindows::NFile::NDir::CreateComplexDir(curFull);
      return S_OK;
    }
    curIsFile = true;
    curAttrib = attrib;
    int slashPos = curRel.ReverseFind_PathSepar();
    if (slashPos >= 0) {
      FString parent = destDir + us2fs(curRel.Left((unsigned)slashPos));
      NWindows::NFile::NDir::CreateComplexDir(parent);
    }
    NWindows::NFile::NFind::CFileInfo fi;
    if (fi.Find(curFull)) {
      if (!NWindows::NFile::NDir::DeleteFileAlways(curFull)) {  // -y: overwrite without asking
        opError = qz_fs_error(curFull);
        return E_ABORT;
      }
    }
    COutFileStream *spec = new COutFileStream;
    CMyComPtr<ISequentialOutStream> loc(spec);
    if (!spec->Create_ALWAYS(curFull)) {
      opError = qz_fs_error(curFull);
      return E_ABORT;
    }
    outSpec = spec;
    outFile = loc;
    *outStream = loc.Detach();
    return S_OK;
  } catch (...) {
    opError = "Internal extraction error";
    return E_ABORT;
  }
}

Z7_COM7F_IMF(QzExtractCb::PrepareOperation(Int32 /* askExtractMode */)) {
  return S_OK;
}

static const char *qz_op_result_name(Int32 r) {
  using namespace NArchive::NExtract;
  switch (r) {
    case NOperationResult::kUnsupportedMethod:
      return "Unsupported Method";
    case NOperationResult::kCRCError:
      return "CRC Failed";
    case NOperationResult::kDataError:
      return "Data Error";
    case NOperationResult::kUnavailable:
      return "Unavailable data";
    case NOperationResult::kUnexpectedEnd:
      return "Unexpected end of data";
    case NOperationResult::kDataAfterEnd:
      return "There are some data after the end of the payload data";
    case NOperationResult::kIsNotArc:
      return "Is not archive";
    case NOperationResult::kHeadersError:
      return "Headers Error";
    default:
      return NULL;
  }
}

Z7_COM7F_IMF(QzExtractCb::SetOperationResult(Int32 operationResult)) {
  doneFiles++;
  report();
  if (operationResult == NArchive::NExtract::NOperationResult::kOK) {
    if (curIsFile)
      filesWritten++;
    if (outSpec) {
      if (curMtDef)
        outSpec->SetMTime(&curMt);
      outSpec->Close();
    }
    outFile.Release();
    outSpec = NULL;
    if (!testMode && curIsFile && curAttribDef)
      NWindows::NFile::NDir::SetFileAttrib_PosixHighDetect(curFull, curAttrib);
  } else {
    numErrors++;
    if (firstError.empty()) {
      const char *kind = qz_op_result_name(operationResult);
      std::string msg = kind ? kind : "Error";
      if (!curRelUtf8.empty()) {
        msg += " : ";
        msg += curRelUtf8;
      }
      firstError = msg;
    }
  }
  outFile.Release();
  outSpec = NULL;
  curIsFile = false;
  return S_OK;
}

Z7_COM7F_IMF(QzExtractCb::CryptoGetTextPassword(BSTR *outPassword)) {
  passwordAsked = true;
  if (!passwordDefined)
    return E_ABORT;
  return StringToBstr(password.Ptr(), outPassword);
}

// Shared driver: open, select, run. testMode picks kTest (no sinks).
static int qz_run_op(const char *archive_utf8, const char *pw_or_null,
                     const char *dest_utf8_or_null, const char **sel,
                     size_t nsel, bool testMode, QzProgressCb pfn, void *pctx,
                     uint64_t *files_out, char *errbuf, size_t errlen) {
  try {
    QzArc arc;
    bool asked = false;
    std::string err = qz_open_link(arc, archive_utf8, pw_or_null, asked);
    if (!err.empty()) {
      set_err(errbuf, errlen, err.c_str());
      return -1;
    }
    // Single-arc archives only (same boundary as listing: compound and
    // multi-volume layouts need link-level volume handling we don't ship).
    if (arc.arcLink.Arcs.Size() != 1) {
      set_err(errbuf, errlen, "multi-part archives are not supported");
      return -1;
    }
    CMyComPtr<IInArchive> archive = arc.arcLink.Arcs.Back().Archive;
    UInt32 n = 0;
    if (archive->GetNumberOfItems(&n) != S_OK) {
      set_err(errbuf, errlen, "Cannot read archive contents");
      return -1;
    }
    // Selection: exact paths, plus "folder/" prefix for chosen folders.
    // Empty request = everything. Unsafe entries never leave the engine.
    // Trailing slashes are ignored on both sides: directory entries arrive
    // as `pics/` from zip-style archives while the UI sends the verbatim
    // listing path, and the old exact/prefix compare matched neither the
    // folder itself nor anything under it (silent empty extraction).
    std::vector<std::string> want;
    if (sel && nsel > 0)
      for (size_t k = 0; k < nsel; k++)
        if (sel[k]) {
          std::string w(sel[k]);
          while (w.size() > 1 &&
                 (w.back() == '/' || w.back() == '\\'))
            w.pop_back();
          want.push_back(w);
        }
    auto trim_rel = [](const std::string &r) {
      size_t n = r.size();
      while (n > 1 && (r[n - 1] == '/' || r[n - 1] == '\\'))
        n--;
      return r.substr(0, n);
    };
    std::vector<UInt32> idx;
    for (UInt32 i = 0; i < n; i++) {
      NWindows::NCOM::CPropVariant prop;
      if (archive->GetProperty(i, kpidPath, &prop) != S_OK ||
          prop.vt != VT_BSTR)
        continue;
      AString a =
          UnicodeStringToMultiByte(UString(prop.bstrVal), CP_UTF8);
      std::string rel(a.Ptr());
      if (!qz_path_safe(rel))
        continue;
      const std::string trel = trim_rel(rel);
      if (!want.empty()) {
        bool hit = false;
        for (size_t k = 0; k < want.size() && !hit; k++)
          hit = (trel == want[k] ||
                 (trel.size() > want[k].size() &&
                  trel.compare(0, want[k].size(), want[k]) == 0 &&
                  (trel[want[k].size()] == '/' ||
                   trel[want[k].size()] == '\\')));
        if (!hit)
          continue;
      }
      idx.push_back(i);
    }
    // Heap + COM-owned: the engine AddRef/Releases the callback, so a
    // stack object would be `delete`d out from under us (SIGABRT).
    QzExtractCb *cbSpec = new QzExtractCb();
    CMyComPtr<IArchiveExtractCallback> cb(cbSpec);
    cbSpec->arc = archive;
    if (!testMode && dest_utf8_or_null) {
      cbSpec->destDir = us2fs(UString(dest_utf8_or_null));
      NWindows::NFile::NName::NormalizeDirPathPrefix(cbSpec->destDir);
      // The root itself may not exist (fresh subfolder runs): the engine
      // only creates nested parents per file.
      NWindows::NFile::NDir::CreateComplexDir(cbSpec->destDir);
    }
    cbSpec->testMode = testMode;
    if (pw_or_null && pw_or_null[0] != '\0') {
      MultiByteToUnicodeString2(cbSpec->password, AString(pw_or_null), CP_UTF8);
      cbSpec->passwordDefined = true;
    }
    cbSpec->totalFiles = (uint64_t)idx.size();
    cbSpec->progressFn = pfn;
    cbSpec->progressCtx = pctx;
    // Never NULL+0: some handlers read that as "everything". An empty
    // selection extracts nothing (Rust maps 0 files to the noop error).
    HRESULT hr = S_OK;
    if (!idx.empty()) {
      hr = archive->Extract(idx.data(), (UInt32)idx.size(),
                            testMode ? 1 : 0, cb);
    }
    if (!cbSpec->opError.empty()) {
      set_err(errbuf, errlen, cbSpec->opError.c_str());
      return -1;
    }
    // A password asked mid-run that still failed means wrong password —
    // ahead of per-file CRC noise, mirroring the sidecar contract.
    if (cbSpec->passwordAsked && (hr != S_OK || cbSpec->numErrors > 0)) {
      set_err(errbuf, errlen, "Wrong password");
      return -1;
    }
    if (cbSpec->numErrors > 0) {
      set_err(errbuf, errlen, cbSpec->firstError.c_str());
      return -1;
    }
    if (hr != S_OK) {
      char msg[128];
      snprintf(msg, sizeof(msg), "Operation failed (0x%08X)", (unsigned)hr);
      set_err(errbuf, errlen, msg);
      return -1;
    }
    if (files_out)
      *files_out = cbSpec->filesWritten;
    return 0;
  } catch (...) {
    set_err(errbuf, errlen,
            testMode ? "Internal test error" : "Internal extraction error");
    return -1;
  }
}

extern "C" int qz_extract(const char *archive_utf8,
                          const char *password_utf8_or_null,
                          const char *dest_utf8, const char **sel_paths,
                          size_t sel_count, uint64_t *files_out, char *errbuf,
                          size_t errlen) {
  if (!dest_utf8 || !dest_utf8[0]) {
    set_err(errbuf, errlen, "No destination folder");
    return -1;
  }
  return qz_run_op(archive_utf8, password_utf8_or_null, dest_utf8, sel_paths,
                   sel_count, false, NULL, NULL, files_out, errbuf, errlen);
}

extern "C" int qz_test(const char *archive_utf8,
                       const char *password_utf8_or_null,
                       QzProgressCb progress_or_null, void *progress_ctx,
                       char *errbuf, size_t errlen) {
  return qz_run_op(archive_utf8, password_utf8_or_null, NULL, NULL, 0, true,
                   progress_or_null, progress_ctx, NULL, errbuf, errlen);
}
