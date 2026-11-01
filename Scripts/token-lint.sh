#!/bin/zsh
# Fails when a view hard-codes a color instead of using QZTheme.
set -euo pipefail
here=${0:A:h}
root=${here:h}
cd "$root"

if grep -RInE 'Color\((red|white):|#[0-9A-Fa-f]{6}' \
    Sources/QuarkZip --exclude-dir=Design; then
  echo "token-lint: FAIL, use QZTheme tokens" >&2
  exit 1
fi
echo "token-lint: PASS"
