#!/usr/bin/env bash
# Stellt dem ausgerollten Bot eine Frage und druckt seine Antwort (JSON), z. B. nach dem Ausrollen.
#
# Aufruf:  scripts/frage.sh "Wer bist du?"
# Adresse: Umgebungsvariable ANSWER_URL, sonst die Function URL aus dem ersten Ausrollen
# (öffentlich, das Frontend ruft sie auch auf). Jede Frage zählt zur Tagesgrenze des Bots.
set -euo pipefail

ANSWER_URL="${ANSWER_URL:-https://gfg2gma2jjaufhkw3ssslmafsu0wzapj.lambda-url.eu-central-1.on.aws/}"

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo 'Aufruf: scripts/frage.sh "Frage"' >&2
  exit 2
fi

# jq baut das JSON, damit Anführungszeichen in der Frage nichts zerbrechen.
response=$(jq -n --arg question "$1" '{question: $question}' \
  | curl -sS -X POST "$ANSWER_URL" -H 'content-type: application/json' --data-binary @-)
# Schön formatiert, wenn es JSON ist; sonst (etwa eine Fehlerseite) unverändert.
echo "$response" | jq . 2>/dev/null || echo "$response"
