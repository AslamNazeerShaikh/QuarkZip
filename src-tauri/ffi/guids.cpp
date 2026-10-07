// Single TU that DEFINES all 7-Zip COM interface GUIDs.
//
// Background: interface headers declare `EXTERN_C const GUID IID_X`
// (see MyWindows.h: without INITGUID it is a bare extern declaration).
// Upstream DLL builds satisfy them via their DllMain TUs; the static
// console links fine because it compiles the same set — for OUR static
// lib this file owns the one definition (MyInitGuid.h: "Each GUID must
// be initialized exactly once in project").
//
// If the link later complains about a missing IID_Y, add the header that
// declares it to the list below.
#include "Common/MyInitGuid.h"
#include "7zip/IStream.h"
#include "7zip/ICoder.h"
#include "7zip/IPassword.h"
#include "7zip/IProgress.h"
#include "7zip/Archive/IArchive.h"
#include "7zip/UI/Common/ArchiveOpenCallback.h"
