// Single translation unit that defines the 7-Zip COM interface GUIDs.
//
// The upstream headers declare each IID as an extern symbol unless INITGUID
// is defined. Static console builds get the definitions from their bundle
// translation units; our library needs one owner. Add a header here when the
// linker reports a missing IID.

#include "Common/MyInitGuid.h"

#include "7zip/IStream.h"
#include "7zip/ICoder.h"
#include "7zip/IPassword.h"
#include "7zip/IProgress.h"
#include "7zip/Archive/IArchive.h"
#include "7zip/UI/Common/ArchiveOpenCallback.h"
#include "7zip/UI/Common/IFileExtractCallback.h"
#include "7zip/UI/Common/ArchiveExtractCallback.h"

// SystemInfo.cpp calls this when large-page support is compiled in. The
// console build gets it from Bench.cpp, which pulls the whole benchmark UI.
// QuarkZip never shows the benchmark string, so the symbol is provided here
// without dragging that dependency into the app.
#include "Common/MyString.h"

void Add_LargePages_String(AString &) {}
