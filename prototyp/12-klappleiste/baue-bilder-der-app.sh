#!/usr/bin/env bash
# Erzeugt bilder-der-app.js: Herz und Smiley genau so, wie die echte App sie zeichnet
# (frontend/src/domain/picture/), als einfaches Skript ohne Module für den Prototyp.
# Danach gibt es im Prototyp die globale Variable BILDER_DER_APP mit drawPicture und SMALLEST_SIZE.
#
# Nur nötig, wenn sich die Bilder in der App ändern. Braucht einmal npm install in frontend/.
set -euo pipefail

hier="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$hier/../.." && pwd)"
rolldown="$repo/frontend/node_modules/.bin/rolldown"
if [ ! -x "$rolldown" ]; then
  echo "Fehler: $rolldown fehlt (in frontend/ einmal npm install)." >&2
  exit 2
fi

eintrag="$(mktemp --suffix=.ts)"
gebaut="$(mktemp --suffix=.js)"
trap 'rm -f "$eintrag" "$gebaut"' EXIT
echo "export { drawPicture, SMALLEST_SIZE } from \"$repo/frontend/src/domain/picture/picture\";" > "$eintrag"
"$rolldown" "$eintrag" --format iife --name BILDER_DER_APP --file "$gebaut" > /dev/null

{
  echo "// ERZEUGT von baue-bilder-der-app.sh aus frontend/src/domain/picture/ – nicht von Hand ändern."
  cat "$gebaut"
} > "$hier/bilder-der-app.js"
echo "Geschrieben: $hier/bilder-der-app.js"
