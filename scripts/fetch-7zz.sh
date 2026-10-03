#!/usr/bin/env bash
# Fetch pinned 7-Zip console binaries (64-bit only) and normalize them to
# Tauri v2 sidecar names under src-tauri/binaries/.
#
# Pinned version: 7-Zip 26.03 (2026-09-03), see docs/7zz-binaries.md.
# Network + ~30 MB download. Re-run to re-fetch.
#
# Usage:
#   ./scripts/fetch-7zz.sh
#
# Layout produced (Tauri sidecar convention <name>-<target-triple>[.exe]):
#   src-tauri/binaries/7zz-aarch64-apple-darwin
#   src-tauri/binaries/7zz-x86_64-apple-darwin      (same upstream mac binary, see docs)
#   src-tauri/binaries/7zz-x86_64-unknown-linux-gnu
#   src-tauri/binaries/7zz-aarch64-unknown-linux-gnu
#   src-tauri/binaries/7zz-x86_64-pc-windows-msvc.exe
#   src-tauri/binaries/7zz-aarch64-pc-windows-msvc.exe
set -euo pipefail

VER_DOT="26.03"
TAG="2603" # asset names strip the dot: 7z2603-...
BASE="https://github.com/ip7z/7zip/releases/download/${VER_DOT}"
CACHE="vendor/7zz-cache"
OUT="src-tauri/binaries"

mkdir -p "$CACHE" "$OUT"
cd "$(dirname "$0")/.."

fetch() {
  local file="$1"
  if [[ -f "$CACHE/$file" ]]; then
    echo "cached: $file"
  else
    echo "download: $BASE/$file"
    curl -fL --retry 3 -o "$CACHE/$file" "$BASE/$file"
  fi
}

# 64-bit only assets.
fetch "7z${TAG}-mac.tar.xz"
fetch "7z${TAG}-linux-x64.tar.xz"
fetch "7z${TAG}-linux-arm64.tar.xz"
fetch "7z${TAG}-extra.7z"
fetch "7z${TAG}-arm64.exe"

echo "--- cache hashes (pin these in docs/7zz-binaries.md after review) ---"
shasum -a 256 "$CACHE"/* | tee "$CACHE/SHA256SUMS"

echo "--- mac tar contents ---"
tar -tf "$CACHE/7z${TAG}-mac.tar.xz"
echo "--- linux x64 tar contents ---"
tar -tf "$CACHE/7z${TAG}-linux-x64.tar.xz"
echo "--- linux arm64 tar contents ---"
tar -tf "$CACHE/7z${TAG}-linux-arm64.tar.xz"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/mac" "$WORK/linux-x64" "$WORK/linux-arm64"

tar -xf "$CACHE/7z${TAG}-mac.tar.xz" -C "$WORK/mac"
tar -xf "$CACHE/7z${TAG}-linux-x64.tar.xz" -C "$WORK/linux-x64"
tar -xf "$CACHE/7z${TAG}-linux-arm64.tar.xz" -C "$WORK/linux-arm64"

echo "--- extracted tree ---"
find "$WORK" -maxdepth 3 | sort

# Locate the console binary inside each tree (names differ per release: 7zz, 7zzs).
pick() {
  find "$1" -type f \( -name '7zz' -o -name '7zzs' -o -name '7zz.exe' -o -name '7za.exe' \) | head -n 1
}

MAC_BIN="$(pick "$WORK/mac")"
LX64_BIN="$(pick "$WORK/linux-x64")"
LARM_BIN="$(pick "$WORK/linux-arm64")"
[[ -n "$MAC_BIN" ]] || { echo "ERROR: no console binary in mac tar"; exit 1; }
[[ -n "$LX64_BIN" ]] || { echo "ERROR: no console binary in linux x64 tar"; exit 1; }
[[ -n "$LARM_BIN" ]] || { echo "ERROR: no console binary in linux arm64 tar"; exit 1; }

# Upstream ships ONE mac tar for arm64+x86-64: install it under both triples
# after checking whether it is universal (lipo) or single-arch (file).
echo "--- mac binary info ---"
file "$MAC_BIN" || true
lipo -info "$MAC_BIN" 2>/dev/null || true

cp "$MAC_BIN" "$OUT/7zz-aarch64-apple-darwin"
cp "$MAC_BIN" "$OUT/7zz-x86_64-apple-darwin"
cp "$LX64_BIN" "$OUT/7zz-x86_64-unknown-linux-gnu"
cp "$LARM_BIN" "$OUT/7zz-aarch64-unknown-linux-gnu"
chmod +x "$OUT"/7zz-* 2>/dev/null || true

# Windows: extra.7z holds BOTH arches as standalone 7za.exe.
# NOTE: 7za is standalone but ships fewer codecs than full 7z (e.g. no RAR).
# Full-codec Windows support (7z.exe + 7z.dll as resources) is a follow-up;
# see docs/7zz-binaries.md. The arm64 installer is cached for that work.
"$OUT/7zz-aarch64-apple-darwin" x "$CACHE/7z${TAG}-extra.7z" -o"$WORK/win" x64/7za.exe arm64/7za.exe > /dev/null
cp "$WORK/win/x64/7za.exe" "$OUT/7zz-x86_64-pc-windows-msvc.exe"
cp "$WORK/win/arm64/7za.exe" "$OUT/7zz-aarch64-pc-windows-msvc.exe"

echo "--- installed sidecars ---"
ls -la "$OUT"
