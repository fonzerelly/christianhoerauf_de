#!/usr/bin/env bash
# Fügt den Prototyp zu EINER HTML-Datei zusammen: Jede Zeile <script src="pfad.js"></script>
# wird durch den Inhalt der Datei ersetzt. Holt vorher den Lebenslauf-Schnappschuss neu.
#
#   /mnt/share/website/klappleiste/index.html
#
# Anderes Ziel: ZIEL=/irgendwo ./baue-einzeldatei.sh
set -euo pipefail

quelle="$(cd "$(dirname "$0")" && pwd)"
ziel="${ZIEL:-/mnt/share/website}/klappleiste"
skript_zeile='^[[:space:]]*<script src="([^"]+)"></script>[[:space:]]*$'

"$quelle/hole-lebenslauf.sh"
mkdir -p "$ziel"
while IFS= read -r zeile || [ -n "$zeile" ]; do
  if [[ "$zeile" =~ $skript_zeile ]]; then
    datei="$quelle/${BASH_REMATCH[1]}"
    echo "<script>"
    echo "// ===== $(basename "$datei") ====="
    cat "$datei"
    echo "</script>"
  else
    printf '%s\n' "$zeile"
  fi
done < "$quelle/index.html" > "$ziel/index.html"

if grep -q '<script src=' "$ziel/index.html"; then
  echo "Fehler: In $ziel/index.html wird noch ein Skript von außen geladen." >&2
  exit 1
fi
echo "Geschrieben: $ziel/index.html ($(wc -c < "$ziel/index.html") Bytes)"
