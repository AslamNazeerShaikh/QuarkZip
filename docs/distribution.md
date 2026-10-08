# Distribution (macOS arm64 only, for now)

Releases are built by `.github/workflows/release.yml` on Apple Silicon
runners (`macos-14`, native arm64 toolchain, `--target
aarch64-apple-darwin`). Every push to `main` publishes the rolling
`main-latest` prerelease with the arm64 `.dmg`; PRs run the gates without
publishing. The FFI engine compiles from committed `vendor/7zip` sources;
only the `7zz` sidecar consoles are fetched at build time (pinned 26.03).

## Signing (no paid Apple Developer account)

The bundle uses an **ad-hoc signature** (`bundle.macos.signingIdentity:
"-"`). This is free and requires no certificates or secrets — and it is
the strongest free option that exists. Its limits, per
[Tauri's macOS signing guide](https://tauri.app/distribute/sign/macos/):

- No notarization is possible without a paid ($99/yr) Developer account,
  so Gatekeeper treats the app as from an unidentified developer.
- First launch on another Mac needs explicit approval: right-click the app
  > Open (or allow it in Privacy & Security). This cannot be removed for
  > free — a personal/self-signed certificate does **not** silence
  > Gatekeeper either (only Apple-issued Developer ID identities do).
- Upgrading later means adding `APPLE_CERTIFICATE`,
  `APPLE_CERTIFICATE_PASSWORD`, and notarization credentials
  (`APPLE_API_ISSUER` / `APPLE_API_KEY[_PATH]` or Apple ID) as repo
  secrets — no workflow rewrite needed beyond reading them.

## Permissions

The app needs **no macOS privacy permissions** (no camera, microphone,
location, or contacts) and ships no special entitlements: file access is
user-driven through the native open/save dialogs, and the `7zz` sidecar
runs under a scoped `shell:allow-execute` capability
(`src-tauri/capabilities/default.json`). Denied/unavailable backends are
handled gracefully in the UI (quiet error text or silent no-op), never an
unhandled rejection — see `App.test.tsx`
`should_show_quiet_error_when_archive_picker_denied`.
