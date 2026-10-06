---

name: default
description: LSP configuration for QuarkZip (rust-analyzer + TypeScript + JSON)
version: 1.0.0
enabled: true
servers:

# Rust Language Server

- name: rust-analyzer
  command: rust-analyzer
  args: []
  filetypes:
  - rust
    rootPatterns:
  - "src-tauri/Cargo.toml"
  - "Cargo.toml"
  - "Cargo.lock"

# TypeScript Language Server

- name: typescript-language-server
  command: typescript-language-server
  args:
  - --stdio
    filetypes:
  - typescript
  - typescriptreact
  - javascript
    rootPatterns:
  - "package.json"
  - "tsconfig.json"

# JSON Language Server (tauri.conf.json, opencode.json)

- name: json-language-server
  command: vscode-json-language-server
  args:
  - --stdio
    filetypes:
  - json
    rootPatterns:
  - package.json

settings:

# General settings

completion:
triggerCharacters: [".", ":", "<", "@", "#"]
resolveTimeout: 5000

diagnostics:
enable: true
debounce: 300
