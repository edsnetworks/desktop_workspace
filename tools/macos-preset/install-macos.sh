#!/usr/bin/env bash
# Installa il preset "macOS" in Desktop Workspace (idempotente, con backup).
# Uso:  sudo bash install-macos.sh /percorso/app/desktop_workspace  [/percorso/macos-decoration.css]
set -euo pipefail
APP="${1:?Indica la cartella dell app, es. /var/www/html/custom_apps/desktop_workspace}"
CSS_SRC="${2:-$(dirname "$0")/macos-decoration.css}"
[ -f "$APP/appinfo/info.xml" ] || { echo "ERRORE: $APP non e' l'app desktop_workspace"; exit 1; }
[ -f "$CSS_SRC" ] || { echo "ERRORE: manca $CSS_SRC"; exit 1; }
BK="$APP/.macos-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK/lib/Service" "$BK/lib/Controller" "$BK/templates" "$BK/js" "$BK/css"
for f in lib/Controller/SettingsController.php lib/Service/DecorationService.php templates/main.php templates/settings-personal.php js/desktop-shell.js js/personal.js; do cp -p "$APP/$f" "$BK/$f"; done
echo "Backup in: $BK"

# 1) CSS
install -m 0644 "$CSS_SRC" "$APP/css/macos-decoration.css"

# 2) PHP: valore ammesso
F="$APP/lib/Service/DecorationService.php"
grep -q "MACOS" "$F" || {
  sed -i "s/    public const RETRO = 'retro';/    public const RETRO = 'retro';\n    public const MACOS = 'macos';/" "$F"
  sed -i "s/\[self::STANDARD, self::REDMOND, self::RETRO\]/[self::STANDARD, self::REDMOND, self::RETRO, self::MACOS]/" "$F"
}
# 2b) PHP: salvataggio impostazioni (senza questo lo stile torna indietro)
F="$APP/lib/Controller/SettingsController.php"
grep -q "DecorationService::MACOS" "$F" || sed -i "s/DecorationService::REDMOND, DecorationService::RETRO\]/DecorationService::REDMOND, DecorationService::RETRO, DecorationService::MACOS]/" "$F"
# 3) Template principale: valore ammesso + caricamento CSS
F="$APP/templates/main.php"
grep -q "'macos'" "$F" || sed -i "s/\['redmond', 'retro'\], true)/['redmond', 'retro', 'macos'], true)/" "$F"
grep -q "macos-decoration" "$F" || sed -i "s/^style('desktop_workspace', 'shell-layout');/style('desktop_workspace', 'shell-layout');\nstyle('desktop_workspace', 'macos-decoration');/" "$F"
# 3b) Barra dei menu: script
install -m 0644 "$(dirname "$CSS_SRC")/macos-menubar.js" "$APP/js/macos-menubar.js"
F="$APP/templates/main.php"
grep -q "macos-menubar" "$F" || sed -i "s/^script('desktop_workspace', 'desktop-shell');/script('desktop_workspace', 'desktop-shell');\nscript('desktop_workspace', 'macos-menubar');/" "$F"
# 4) JS: valori ammessi
for f in js/desktop-shell.js js/personal.js; do
  grep -q "'macos'" "$APP/$f" || sed -i "s/\['redmond', 'retro'\]/['redmond', 'retro', 'macos']/g" "$APP/$f"
done
# 4b) Una sola finestra Files: le cartelle del desktop riusano la finestra esistente
F="$APP/js/desktop-shell.js"
grep -q "openFilesWindowReuse" "$F" || {
  SN="$(dirname "$CSS_SRC")/files-reuse.snippet"
  sed -i -e '/^        function openFavorite(el) {/{' -e "e cat $SN" -e '}' "$F"
  sed -i "s/openExternalWindow({ appId: \`\${idPrefix}-\${Date.now()}\`,/openFilesWindowReuse({ appId: \`\${idPrefix}-\${Date.now()}\`,/" "$F"
}
# 4c) Riconoscimento cartelle indipendente dalla lingua (evita la seconda finestra)
F="$APP/js/desktop-shell.js"
grep -q "isFolderRowDeep" "$F" || {
  SN2="$(dirname "$CSS_SRC")/folder-detect.snippet"
  sed -i -e '/^    function wireIframeNavigationInterception(doc, app) {/{' -e "e cat $SN2" -e '}' "$F"
  sed -i "s/const isFolderRow = row?\\.classList\\.contains.*\$/const isFolderRow = isFolderRowDeep(row, button);/" "$F"
}
# 4d) Verifica lato server: cartella o file? (le cartelle restano nella stessa finestra)
F="$APP/js/desktop-shell.js"
grep -q "dwDeferFolderCheck" "$F" || {
  SN3="$(dirname "$CSS_SRC")/folder-verify.snippet"
  sed -i -e '/^    function openNativeFilesViewerWindow(row, button, sourceApp = null) {/{' -e "e cat $SN3" -e '}' "$F"
  sed -i "s/^    function openNativeFilesViewerWindow(row, button, sourceApp = null) {/&\n        if (dwDeferFolderCheck(row, button, sourceApp)) return true;/" "$F"
  sed -i "s/^        const onActivate = (event) => {/&\n            if (doc.__dwSkip) return;/" "$F"
}
# 5) Voce nei menu a tendina delle impostazioni personali
F="$APP/templates/settings-personal.php"
grep -q 'value="macos"' "$F" || {
  sed -i "/value=\"retro\" <?= \$_\['decoration'\]/a\\                    <option value=\"macos\" <?= \$_['decoration'] === 'macos' ? 'selected' : '' ?>>macOS</option>" "$F"
  sed -i "/value=\"retro\" <?= \$_\['iconDecoration'\]/a\\                    <option value=\"macos\" <?= \$_['iconDecoration'] === 'macos' ? 'selected' : '' ?>>macOS</option>" "$F"
}
chown -R --reference="$APP/appinfo/info.xml" "$APP/css/macos-decoration.css" "$APP/lib" "$APP/templates" "$APP/js" 2>/dev/null || true

# 5b) macOS come stile predefinito per tutti gli utenti che non hanno scelto altro
F="$APP/lib/Service/DecorationService.php"
grep -q "DEFAULT_STYLE" "$F" || {
  sed -i "s/    public const MACOS = 'macos';/&\n    public const DEFAULT_STYLE = 'macos';/" "$F"
  sed -i -e "s/^            self::STANDARD,\$/            self::DEFAULT_STYLE,/" \
         -e "s/? \$value : self::STANDARD;/? \$value : self::DEFAULT_STYLE;/" \
         -e "s/'decoration' => self::STANDARD,/'decoration' => self::DEFAULT_STYLE,/" \
         -e "s/'iconDecoration' => self::STANDARD,/'iconDecoration' => self::DEFAULT_STYLE,/" \
         -e "s/SettingsController::ICON_DECORATION_KEY, self::STANDARD)/SettingsController::ICON_DECORATION_KEY, self::DEFAULT_STYLE)/" \
         -e "s/^            return self::STANDARD;/            return self::DEFAULT_STYLE;/" "$F"
  F2="$APP/lib/Controller/SettingsController.php"
  sed -i -e "s/'decoration' => DecorationService::STANDARD,/'decoration' => DecorationService::DEFAULT_STYLE,/" \
         -e "s/'iconDecoration' => DecorationService::STANDARD,/'iconDecoration' => DecorationService::DEFAULT_STYLE,/" \
         -e "s/: DecorationService::STANDARD;/: DecorationService::DEFAULT_STYLE;/" \
         -e "s/\$selected = DecorationService::STANDARD;/\$selected = DecorationService::DEFAULT_STYLE;/" "$F2"
}
# 6) Verifica
echo "--- verifica ---"
ok=1
chk(){ if grep -q "$2" "$APP/$1"; then echo "OK   $1"; else echo "MANCA $1"; ok=0; fi; }
chk lib/Service/DecorationService.php "self::MACOS"
chk lib/Service/DecorationService.php "DEFAULT_STYLE = 'macos'"
chk lib/Controller/SettingsController.php "DecorationService::DEFAULT_STYLE"
chk lib/Controller/SettingsController.php "DecorationService::MACOS"
chk templates/main.php "macos-decoration"
chk templates/main.php "'macos'"
chk templates/main.php "macos-menubar"
chk js/macos-menubar.js "macos-menubar"
chk js/desktop-shell.js "'macos'"
chk js/personal.js "'macos'"
chk js/desktop-shell.js "function openFilesWindowReuse"
chk js/desktop-shell.js "function isFolderRowDeep"
chk js/desktop-shell.js "isFolderRow = isFolderRowDeep"
chk js/desktop-shell.js "function dwDeferFolderCheck"
chk js/desktop-shell.js "if (dwDeferFolderCheck"
chk js/desktop-shell.js "doc.__dwSkip) return"
if [ "$(grep -c "^ *openFilesWindowReuse({ appId" "$APP/js/desktop-shell.js")" = 2 ]; then echo "OK   chiamate riuso finestra (2)"; else echo "MANCA chiamate riuso finestra"; ok=0; fi
chk templates/settings-personal.php 'value="macos"'
[ $ok = 1 ] && echo "ESITO: OK" || echo "ESITO: INCOMPLETO (vedi 'MANCA')"
