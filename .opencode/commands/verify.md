---
description: Build, test, check coverage, and report what changed
---
Run `./Scripts/verify.sh` from the repository root.

If it fails, fix the first error, then run it again until it passes. Report:

1. The commands that ran and their result.
2. Coverage for `QuarkZipKit` and `QZEngine`.
3. Any warning that was suppressed instead of fixed.

Do not claim a change is done until the script exits 0.
