#!/bin/zsh
# Runs every test target with Swift Testing.
set -euo pipefail
here=${0:A:h}
root=${here:h}
scratch="$HOME/Library/Developer/QuarkZip/build"
cd "$root"
swift test --scratch-path "$scratch" "$@"
