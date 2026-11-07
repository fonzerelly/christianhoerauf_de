#!/usr/bin/env bash
# Prüft die Fragendateien docs/backend/antwort-prompt/fragen_*.yaml gegen die aktuellen Modelle:
# Gemma antwortet mit dem Prompt des Bots, Regeln (auch `erwartet` als K5, `verboten` als K10)
# und Qwen bewerten, der Türsteher prüft die Folgefragen. Je Datei die passende Wissensbasis:
# die erfundene Testperson oder die echte.
#
# Aufruf:  scripts/pruefe_fragen.sh                          alle Dateien, Mac mini, 1 Runde
#          scripts/pruefe_fragen.sh testperson pointe        nur diese Dateien
#          scripts/pruefe_fragen.sh --ziel dgx --runden 2    Optionen gehen an messe_antworten.sh
# Dauer auf der DGX etwa 30 s je Antwort: alle 128 Fragen gut eine Stunde je Runde, die
# Testperson-Dateien (30 Fragen) eine Viertelstunde. Einzelheiten in versuche/fragen.<name>.json.
set -euo pipefail
cd "$(dirname "$0")/.."

ordner=../docs/backend/antwort-prompt
namen=()
optionen=()
# Was eine vorhandene Fragendatei benennt, ist ein Name; alles andere (auch „dgx“ hinter --ziel)
# geht an messe_antworten.sh.
for argument in "$@"; do
  if [ -f "$ordner/fragen_$argument.yaml" ]; then
    namen+=("$argument")
  else
    optionen+=("$argument")
  fi
done
if [ ${#namen[@]} -eq 0 ]; then
  namen=(testperson testperson_schwer pointe echt probe antworten)
fi

for name in "${namen[@]}"; do
  datei="$ordner/fragen_$name.yaml"
  if [ ! -f "$datei" ]; then
    echo "Unbekannte Fragendatei: $datei" >&2
    exit 2
  fi
  # Fragen an die erfundene Testperson; alle anderen zielen auf die echte Wissensbasis.
  case "$name" in
    testperson | testperson_schwer | pointe) wissensbasis=testsammlung/testperson ;;
    *) wissensbasis=wissensbasis ;;
  esac
  echo "== fragen_$name.yaml ($wissensbasis)"
  scripts/messe_antworten.sh --fragen "$datei" --teil alle --wissensbasis "$wissensbasis" \
    --aus "versuche/fragen.$name.json" "${optionen[@]}"
done
