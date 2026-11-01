#!/bin/zsh
# The gate every change must pass: build, tests, coverage, vendor, tokens.
set -euo pipefail
here=${0:A:h}
root=${here:h}
scratch="$HOME/Library/Developer/QuarkZip/build"
cd "$root"

echo "==> build"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
swift build --scratch-path "$scratch" 2>&1 | tee "$log"
if grep -E "Sources/(QuarkZip|QuarkZipKit)/.*warning:" "$log" >/dev/null; then
  echo "verify failed: Swift warnings above" >&2
  exit 1
fi

echo "==> tests"
./Scripts/test.sh

echo "==> coverage"
./Scripts/coverage.sh

echo "==> vendor"
./Scripts/vendor-check.sh

echo "==> tokens"
./Scripts/token-lint.sh

echo "==> contrast"
./Scripts/contrast-check.sh

echo "verify: PASS"
