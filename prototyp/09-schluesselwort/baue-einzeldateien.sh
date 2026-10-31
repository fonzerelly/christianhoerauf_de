#!/usr/bin/env bash
# Fügt die beiden Varianten zu je EINER HTML-Datei zusammen: Jede Zeile
# <script src="pfad.js"></script> wird durch den Inhalt der Datei ersetzt (Pfad relativ
# zur jeweiligen index.html). Ergebnis:
#
#   /mnt/share/website/schluesselwort-overlay/index.html
#   /mnt/share/website/schluesselwort-briefpapier/index.html
#
# Anderes Ziel: ZIEL=/irgendwo ./baue-einzeldateien.sh
set -euo pipefail

quelle="$(cd "$(dirname "$0")" && pwd)"
ziel="${ZIEL:-/mnt/share/website}"
skript_zeile='^[[:space:]]*<script src="([^"]+)"></script>[[:space:]]*$'

# baue <ordner mit index.html> <zielordner>
baue() {
  local von="$1" nach="$2" zeile datei
  mkdir -p "$nach"
  while IFS= read -r zeile || [ -n "$zeile" ]; do
    if [[ "$zeile" =~ $skript_zeile ]]; then
      datei="$von/${BASH_REMATCH[1]}"
      echo "<script>"
      echo "// ===== $(basename "$datei") ====="
      cat "$datei"
      echo "</script>"
    else
      printf '%s\n' "$zeile"
    fi
  done < "$von/index.html" > "$nach/index.html"

  if grep -q '<script src=' "$nach/index.html"; then
    echo "Fehler: In $nach/index.html wird noch ein Skript von außen geladen." >&2
    exit 1
  fi
  echo "Geschrieben: $nach/index.html ($(wc -c < "$nach/index.html") Bytes)"
}

baue "$quelle/overlay" "$ziel/schluesselwort-overlay"
baue "$quelle/briefpapier" "$ziel/schluesselwort-briefpapier"
