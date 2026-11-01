#!/bin/zsh
# Runs the engine suite under Address and Thread Sanitizer.
# Slower than the normal suite; run before a release or after bridge changes.
set -euo pipefail
here=${0:A:h}
root=${here:h}
scratch="$HOME/Library/Developer/QuarkZip/sanitizer-build"
cd "$root"

echo "==> address sanitizer"
ASAN_OPTIONS=detect_leaks=0 swift test \
  --sanitize=address \
  --scratch-path "$scratch" \
  --filter QZEngineTests

echo "==> thread sanitizer"
TSAN_OPTIONS=halt_on_error=1 swift test \
  --sanitize=thread \
  --scratch-path "$scratch" \
  --filter QZEngineTests

echo "sanitizers: PASS"
