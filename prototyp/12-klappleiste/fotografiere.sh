#!/usr/bin/env bash
# Öffnet Prototyp 12 in Chromium (klappen: Firefox; Playwright im Docker) und macht Bildschirmfotos.
#
#   ./fotografiere.sh rundgang     Rundgang auf Desktop und Handy, Höhen, Breiten, Fehler
#   ./fotografiere.sh ecken        Nahaufnahmen beider Ecken der Zeitleiste, auf und zu
#   ./fotografiere.sh klappen      Übergang beim Zu- und Aufklappen in Einzelbildern (0–100 %)
#   ./fotografiere.sh einzeldatei  prüft die gebaute Einzeldatei (vorher baue-einzeldatei.sh)
#
# Zweiter Parameter: Verzeichnis für die Bilder, sonst bilder/ hier (steht in .gitignore).
# Die Einzeldatei liegt wie in baue-einzeldatei.sh unter ${ZIEL:-/mnt/share/website}/klappleiste.
set -euo pipefail

hier="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$hier/../.." && pwd)"
was="${1:-}"
ausgabe="${2:-$hier/bilder}"

case "$was" in
  rundgang | ecken | klappen | einzeldatei) ;;
  *)
    echo "Aufruf: $0 rundgang|ecken|klappen|einzeldatei [verzeichnis-für-bilder]" >&2
    exit 2
    ;;
esac

# Das Docker-Image muss zur Version von playwright-core in frontend/node_modules passen.
paket="$repo/frontend/node_modules/playwright-core/package.json"
if [ ! -f "$paket" ]; then
  echo "Fehler: $paket fehlt (in frontend/ einmal npm install)." >&2
  exit 2
fi
version="$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$paket" | head -1)"

mounts=(-v "$repo":/repo:ro -v "$ausgabe":/ausgabe)
if [ "$was" = einzeldatei ]; then
  einzeldatei="${ZIEL:-/mnt/share/website}/klappleiste"
  if [ ! -f "$einzeldatei/index.html" ]; then
    echo "Fehler: $einzeldatei/index.html fehlt (erst ./baue-einzeldatei.sh)." >&2
    exit 2
  fi
  mounts+=(-v "$einzeldatei":/ziel:ro)
fi

mkdir -p "$ausgabe"
# Chromium läuft als root: Unter einer anderen Kennung (--user) findet es andere Schriften, und
# die Seite sieht anders aus als im Browser. Danach gehören die Bilder wieder dem Aufrufer.
docker run --rm "${mounts[@]}" \
  -e NODE_PATH=/repo/frontend/node_modules \
  -e BESITZER="$(id -u):$(id -g)" \
  "mcr.microsoft.com/playwright:v$version-noble" \
  sh -c 'node "/repo/prototyp/12-klappleiste/fotos/$0.js"; status=$?; chown -R "$BESITZER" /ausgabe; exit $status' "$was"
echo "Bilder: $ausgabe"
