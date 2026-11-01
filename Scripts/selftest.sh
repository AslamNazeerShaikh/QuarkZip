#!/bin/zsh
# Runs the shipping binary in self-test mode against a throwaway archive.
# The checks are the same service calls the UI makes.
set -euo pipefail
here=${0:A:h}
root=${here:h}
app="${1:-$HOME/Applications/QuarkZip.app/Contents/MacOS/QuarkZip}"

if [[ ! -x "$app" ]]; then
  echo "selftest: app not found at $app, run ./build.sh first" >&2
  exit 1
fi

dir=$(mktemp -d /tmp/QuarkZip-selftest.XXXXXX)
trap 'rm -rf "$dir"' EXIT
mkdir -p "$dir/tree/sub"
printf 'hello' > "$dir/tree/hello.txt"
printf 'world' > "$dir/tree/sub/nested.txt"
(
  cd "$dir/tree"
  tar -cf "$dir/sample.tar" hello.txt sub
)

"$app" --selftest "$dir/sample.tar"
