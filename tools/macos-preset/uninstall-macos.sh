#!/usr/bin/env bash
# Ripristina l'ultimo backup creato da install-macos.sh
set -euo pipefail
APP="${1:?Indica la cartella dell app}"
BK=$(ls -d "$APP"/.macos-backup-* 2>/dev/null | sort | head -1)   # il piu' vecchio = stato originale
[ -n "$BK" ] || { echo "Nessun backup trovato"; exit 1; }
cp -pr "$BK"/lib "$BK"/templates "$BK"/js "$APP"/
rm -f "$APP/css/macos-decoration.css" "$APP/js/macos-menubar.js"
echo "Ripristinato da $BK"
