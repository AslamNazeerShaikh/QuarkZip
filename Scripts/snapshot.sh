#!/bin/zsh
# Renders the welcome and browser pages in light and dark without taking
# over the screen. Writes PNGs to /tmp/QuarkZip-shots by default.
set -euo pipefail
here=${0:A:h}
root=${here:h}
app="${1:-$HOME/Applications/QuarkZip.app/Contents/MacOS/QuarkZip}"
dir="${QUARKZIP_SNAPSHOT_DIR:-/tmp/QuarkZip-shots}"
mkdir -p "$dir"

if [[ ! -x "$app" ]]; then
  echo "snapshot: app not found at $app, run ./build.sh first" >&2
  exit 1
fi

QUARKZIP_SNAPSHOT=1 QUARKZIP_SNAPSHOT_DIR="$dir" "$app"
count=$(find "$dir" -name '*.png' -size +0 | wc -l | tr -d ' ')
echo "snapshot: $count PNGs in $dir"
find "$dir" -name '*.png' -size +0 -print
if [[ "$count" -lt 8 ]]; then
  echo "snapshot: FAIL, expected at least 8 images" >&2
  exit 1
fi
echo "snapshot: PASS"
