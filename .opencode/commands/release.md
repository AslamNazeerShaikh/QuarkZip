---
description: Produce a signed release build
---
Call the `build-and-verify` skill, then:

1. Run `./Scripts/verify.sh`.
2. Build release: `./build.sh`.
3. Verify the bundle: `codesign --verify --deep --strict ~/Applications/QuarkZip.app`
   and `spctl -a -vv ~/Applications/QuarkZip.app`.
4. Report the bundle version, the signer, the notarization status, and the
   coverage summary.

Never publish or push a release without the user asking.
