---
description: Rebuild the 7-Zip engine and run its integration tests
---
Run:

```
swift build --target QZEngine
swift test --filter QZEngineTests
```

If the bridge changed, also run `./Scripts/test-engine.sh` for the sanitizer
pass. Report the archive formats exercised and any format that failed to
open.
