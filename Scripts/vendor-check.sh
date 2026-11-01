#!/bin/zsh
# Verifies that the vendored 7-Zip tree is byte-identical to the pinned
# import. Regenerate with: ./Scripts/vendor-check.sh --record
set -euo pipefail
here=${0:A:h}
root=${here:h}
cd "$root"

actual=$(find vendor/7zip -type f -print0 | LC_ALL=C sort -z |
  xargs -0 shasum -a 256 | shasum -a 256 | awk '{print $1}')
record="$here/vendor-tree.sha256"

if [[ "${1:-}" == "--record" ]]; then
  echo "$actual" > "$record"
  echo "recorded vendor tree hash: $actual"
  exit 0
fi

if [[ ! -f "$record" ]]; then
  echo "vendor-check: no recorded hash; run --record once" >&2
  exit 1
fi

expected=$(cat "$record")
if [[ "$actual" != "$expected" ]]; then
  echo "vendor-check: FAIL" >&2
  echo "  expected $expected" >&2
  echo "  actual   $actual" >&2
  exit 1
fi
echo "vendor-check: PASS ($actual)"
