#!/bin/zsh
# Fails when a functional text pair drops below the HIG 4.5:1 floor.
set -euo pipefail
here=${0:A:h}
swift "$here/contrast-check.swift"
