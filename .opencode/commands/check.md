---
name: check
description: Typecheck frontend and Rust backend (cargo check runs in src-tauri)
category: lint
command: npm run build
args:
  - name: rust
    description: Also run cargo check in src-tauri
    type: string
    default: "true"
examples:
  - npm run build
  - (cd src-tauri && cargo check)
