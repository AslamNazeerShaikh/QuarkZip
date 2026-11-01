#!/bin/zsh
# Measures line coverage for our Swift core and the C++ bridge.
#
# The gate is 100% of executable source lines in QuarkZipKit. Compiler
# generated thunks and lines with no code are not counted.
#
# Usage:
#   ./Scripts/coverage.sh            gate QuarkZipKit
#   ./Scripts/coverage.sh --engine   also report Sources/QZEngine
set -euo pipefail
here=${0:A:h}
root=${here:h}
scratch="$HOME/Library/Developer/QuarkZip/build"
cd "$root"

swift test --enable-code-coverage --scratch-path "$scratch" >/dev/null

bin=$(swift build --show-bin-path --scratch-path "$scratch")
profile=$(find "$bin" -name 'default.profdata' -print -quit)
testbin=$(find "$bin" -path '*.xctest/Contents/MacOS/*' -type f -print -quit)
if [[ -z "$profile" || -z "$testbin" ]]; then
  echo "coverage: no profile or test binary found under $bin" >&2
  exit 1
fi

mkdir -p "$root/coverage"
report="$root/coverage/summary.txt"
printf '%-46s %8s %8s %9s\n' "File" "Covered" "Total" "Percent" > "$report"

measure_file() {
  local file=$1
  xcrun llvm-cov show "$testbin" -instr-profile "$profile" "$file" 2>/dev/null |
    awk -F'|' '
      $1 ~ /^ *[0-9]+ *$/ && $2 ~ /[0-9]/ {
        line = $1 + 0
        seen[line] = 1
        if ($2 + 0 > 0) covered[line] = 1
      }
      END { printf "%d %d\n", length(covered), length(seen) }
    '
}

total=0
covered=0
for file in $(find Sources/QuarkZipKit -name '*.swift' | sort); do
  read -r c t <<< "$(measure_file "$root/$file")"
  total=$((total + t))
  covered=$((covered + c))
  percent=$(awk -v c="$c" -v t="$t" 'BEGIN { if (t == 0) print "n/a"; else printf "%.2f%%", c * 100 / t }')
  printf '%-46s %8d %8d %9s\n' "$file" "$c" "$t" "$percent" >> "$report"
done

percent=$(awk -v c="$covered" -v t="$total" 'BEGIN { if (t == 0) print "n/a"; else printf "%.2f%%", c * 100 / t }')
printf '%-46s %8d %8d %9s\n' "TOTAL" "$covered" "$total" "$percent" >> "$report"
echo "QuarkZipKit line coverage: $percent ($covered/$total)"
cat "$report"

if [[ "${1:-}" == "--engine" ]]; then
  engine_report="$root/coverage/engine.txt"
  printf '%-46s %8s %8s %9s\n' "File" "Covered" "Total" "Percent" > "$engine_report"
  for file in Sources/QZEngine/Bridge.cpp Sources/QZEngine/Guids.cpp; do
    read -r c t <<< "$(measure_file "$root/$file")"
    percent=$(awk -v c="$c" -v t="$t" 'BEGIN { if (t == 0) print "n/a"; else printf "%.2f%%", c * 100 / t }')
    printf '%-46s %8d %8d %9s\n' "$file" "$c" "$t" "$percent" >> "$engine_report"
  done
  echo "QZEngine bridge coverage:"
  cat "$engine_report"
fi

if [[ "$total" -eq 0 || "$covered" -ne "$total" ]]; then
  echo "coverage: FAIL, QuarkZipKit must stay at 100% (got $percent)" >&2
  exit 1
fi
echo "coverage: PASS"
