#!/usr/bin/env bash
# (Re-)vendor pinned 7-Zip SOURCES for the in-process bridge (P1) by unpacking
# them into vendor/7zip. That tree is COMMITTED (ABI/API pin — builds never
# depend on the upstream repo surviving); this script is the upgrade path:
# bump VER_DOT/TAG/EXPECTED_SHA256, run it, review the diff, commit.
#
# Pinned version: 7-Zip 26.04 (2026-10-05), see docs/7zip-reference.md.
# Network + ~2 MB download. Re-run to re-fetch (deletes + re-extracts).
#
# Usage:
#   ./scripts/fetch-7z-src.sh
#
# Layout produced:
#   vendor/7z-src-cache/7z2604-src.tar.xz   (pinned tarball, hash-verified)
#   vendor/7zip/{C,CPP,DOC,Asm}/...         (engine sources for build.rs)
set -euo pipefail

VER_DOT="26.04"
TAG="2604" # asset names strip the dot: 7z2604-...
BASE="https://github.com/ip7z/7zip/releases/download/${VER_DOT}"
CACHE="vendor/7z-src-cache"
OUT="vendor/7zip"
FILE="7z${TAG}-src.tar.xz"
# Canonical digest from the GitHub release asset metadata.
EXPECTED_SHA256="9691944c0fe0d01bb49373a704fb983fd33bc98b1738695179dfbf99ac1734f6"

mkdir -p "$CACHE"
cd "$(dirname "$0")/.."

if [[ -f "$CACHE/$FILE" ]]; then
  echo "cached: $FILE"
else
  echo "download: $BASE/$FILE"
  curl -fL --retry 3 -o "$CACHE/$FILE" "$BASE/$FILE"
fi

echo "--- verify sha256 ---"
ACTUAL="$(shasum -a 256 "$CACHE/$FILE" | cut -d' ' -f1)"
if [[ "$ACTUAL" != "$EXPECTED_SHA256" ]]; then
  echo "ERROR: sha256 mismatch for $FILE"
  echo "  expected: $EXPECTED_SHA256"
  echo "  actual:   $ACTUAL"
  exit 1
fi
echo "ok: $FILE"

rm -rf "$OUT"
mkdir -p "$OUT"
tar -xf "$CACHE/$FILE" -C "$OUT"

echo "--- extracted tree ---"
ls "$OUT"
echo "--- source counts ---"
find "$OUT" -name '*.cpp' | wc -l | xargs echo "cpp files:"
find "$OUT" -name '*.c' | wc -l | xargs echo "c files:"
find "$OUT" -name '*.h' | wc -l | xargs echo "h files:"
test -f "$OUT/DOC/License.txt" || { echo "ERROR: DOC/License.txt missing"; exit 1; }
echo "ok: DOC/License.txt present (keep notices + DOC/ texts per docs/7zip-reference.md §5)"
