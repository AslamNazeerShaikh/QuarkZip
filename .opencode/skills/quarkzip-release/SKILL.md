---
name: quarkzip-release
description: Build, sign, notarize, and package QuarkZip for distribution. Use when producing a DMG, checking entitlements, updating the version, or preparing a release.
---

# Release

QuarkZip ships as a signed, notarized DMG. Fully offline, no Sparkle, no
telemetry.

## Version

- `Info.plist.in` holds `CFBundleShortVersionString` and `CFBundleVersion`.
- Bump the short version for a release, the build number for every uploaded
  build.
- The About panel reads both. Never hard-code a version in Swift.

## Build

```bash
./Scripts/verify.sh
./build.sh                       # release, installs to ~/Applications
./Scripts/package.sh             # DMG into dist/QuarkZip-<version>.dmg
```

`build.sh` signs with the first Apple Development identity, or ad hoc when
none exists. Ad hoc builds are for this Mac only.

## Signing and notarization

The release machine needs:

- Developer ID Application certificate in the login keychain.
- `xcrun notarytool` credentials stored in a keychain profile named
  `quarkzip-notary`.
- Hardened runtime on, with the minimum entitlements:
  `com.apple.security.app-sandbox`, `com.apple.security.files.user-selected.read-write`,
  and no network entitlement.

`Scripts/package.sh` signs the app and the DMG, submits with `notarytool
submit --wait`, staples the ticket, and verifies with `spctl -a -vv`.

## Checklist

- [ ] `./Scripts/verify.sh` passes.
- [ ] `vendor/7zip` hash matches `docs/decisions/0002-vendored-7zip.md`.
- [ ] `LICENSE`, `THIRD-PARTY-NOTICES.md`, and the source offer are in the DMG.
- [ ] No `com.apple.security.network.client` entitlement.
- [ ] Snapshots in light and dark were reviewed.
- [ ] Self-test passes on a clean account.
- [ ] Release notes list user-visible changes only.

## Trademark

Do not use the 7-Zip name or logo as QuarkZip's identity. Credit Igor Pavlov
and 7-Zip in About and credits, and state that QuarkZip is an independent
front end.
