#!/usr/bin/env bash
# Holt den öffentlichen Lebenslauf vom Backend und legt ihn als lebenslauf-schnappschuss.js ab.
# Der Prototyp nimmt ihn, wenn der Browser den Abruf verbietet (CORS bei lokal geöffneten
# Dateien). Die Datei steht in .gitignore: Das Repo ist öffentlich.
set -euo pipefail
hier="$(cd "$(dirname "$0")" && pwd)"
adresse="https://gfg2gma2jjaufhkw3ssslmafsu0wzapj.lambda-url.eu-central-1.on.aws/lebenslauf"
json="$(curl -sSf -m 20 "$adresse")"
printf '// Erzeugt von hole-lebenslauf.sh – nicht von Hand ändern, nicht einchecken.\nconst LEBENSLAUF_SCHNAPPSCHUSS = %s;\n' "$json" > "$hier/lebenslauf-schnappschuss.js"
echo "Geschrieben: $hier/lebenslauf-schnappschuss.js"
