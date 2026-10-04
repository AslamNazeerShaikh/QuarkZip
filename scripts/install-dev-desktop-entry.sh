#!/usr/bin/env bash
# Installs a dev desktop entry + icons for QuarkZip so KDE/Wayland task
# manager, app launcher, and Alt+Tab show the app icon.
#
# Background: on Wayland, task managers match windows to desktop entries by
# the xdg `app_id` (Tauri sets it to the `identifier` in tauri.conf.json).
# Without `<identifier>.desktop` installed, the running dev binary
# (target/debug/quarkzip) gets a generic icon. Release bundles
# (`npm run tauri build`) ship their own .desktop file, so this is only
# needed for `npm run tauri dev`.
#
# Usage: ./scripts/install-dev-desktop-entry.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="$(python3 -c "import json; print(json.load(open('$ROOT/src-tauri/tauri.conf.json'))['identifier'])")"
BIN="$ROOT/src-tauri/target/debug/quarkzip"
APP_DIR="$HOME/.local/share/applications"
ICON_BASE="$HOME/.local/share/icons/hicolor"

mkdir -p "$APP_DIR" \
  "$ICON_BASE/32x32/apps" \
  "$ICON_BASE/128x128/apps" \
  "$ICON_BASE/256x256/apps"

cp "$ROOT/src-tauri/icons/32x32.png" "$ICON_BASE/32x32/apps/$APP_ID.png"
cp "$ROOT/src-tauri/icons/128x128.png" "$ICON_BASE/128x128/apps/$APP_ID.png"
cp "$ROOT/src-tauri/icons/128x128@2x.png" "$ICON_BASE/256x256/apps/$APP_ID.png"

cat > "$APP_DIR/$APP_ID.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=QuarkZip (dev)
Comment=QuarkZip archive manager (development build)
Exec=$BIN
Icon=$APP_ID
Categories=Utility;
StartupWMClass=$APP_ID
Terminal=false
EOF

update-desktop-database "$APP_DIR" 2>/dev/null || true
# Refresh KDE's cache (Plasma 6) so the new entry is picked up immediately.
kbuildsycoca6 2>/dev/null || kbuildsycoca5 2>/dev/null || true
gtk-update-icon-cache "$ICON_BASE" 2>/dev/null || true

echo "Installed $APP_ID.desktop — restart the dev app to pick up the icon."
