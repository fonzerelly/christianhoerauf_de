#!/usr/bin/env bash
# Fügt den Prototyp zu EINER HTML-Datei zusammen: Jede Zeile <script src="pfad.js"></script>
# wird durch den Inhalt der Datei ersetzt. Holt vorher den Lebenslauf-Schnappschuss neu. Das Foto
# für das Gimmick (gimmicks.js) kommt als data:-Adresse mit hinein.
#
#   /mnt/share/website/klappleiste/index.html
#
# Anderes Ziel: ZIEL=/irgendwo ./baue-einzeldatei.sh
set -euo pipefail

quelle="$(cd "$(dirname "$0")" && pwd)"
ziel="${ZIEL:-/mnt/share/website}/klappleiste"
skript_zeile='^[[:space:]]*<script src="([^"]+)"></script>[[:space:]]*$'
foto_pfad="../../frontend/src/assets/chris.jpg"
# base64 enthält kein "|", deshalb taugt es als Trennzeichen für sed.
foto_daten="data:image/jpeg;base64,$(base64 -w0 "$quelle/$foto_pfad")"

"$quelle/hole-lebenslauf.sh"
mkdir -p "$ziel"
while IFS= read -r zeile || [ -n "$zeile" ]; do
  if [[ "$zeile" =~ $skript_zeile ]]; then
    datei="$quelle/${BASH_REMATCH[1]}"
    echo "<script>"
    echo "// ===== $(basename "$datei") ====="
    sed "s|$foto_pfad|$foto_daten|" "$datei"
    echo "</script>"
  else
    printf '%s\n' "$zeile"
  fi
done < "$quelle/index.html" > "$ziel/index.html"

if grep -q '<script src=\|chris\.jpg' "$ziel/index.html"; then
  echo "Fehler: In $ziel/index.html wird noch ein Skript oder das Foto von außen geladen." >&2
  exit 1
fi
echo "Geschrieben: $ziel/index.html ($(wc -c < "$ziel/index.html") Bytes)"
