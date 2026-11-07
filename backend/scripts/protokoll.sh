#!/usr/bin/env bash
# Holt die Besucherfragen aus dem CloudWatch-Protokoll des Bots und gibt sie lesbar aus.
# Aufruf:  scripts/protokoll.sh [TAGE]     (Standard: die letzten 2 Tage)
# Nutzt die AWS-Zugangsdaten der Umgebung; nur lesender Zugriff, keine Kosten.
set -euo pipefail

tage="${1:-2}"

# AWS liefert eine Liste [Zeitstempel in ms, Protokollzeile]; die Protokollzeile ist selbst JSON.
aws logs filter-log-events \
  --region eu-central-1 \
  --log-group-name /aws/lambda/christianhoerauf-bot \
  --start-time "$(( ($(date +%s) - tage * 86400) * 1000 ))" \
  --filter-pattern '{ $.question = * }' \
  --query 'events[].[timestamp,message]' \
  --output json |
  TZ=Europe/Berlin jq -r '
    # Nur Zeilen behalten, die JSON sind und eine Frage enthalten.
    [ .[] | (.[1] | fromjson? | objects | select(.question)) as $eintrag
          | $eintrag + {zeit: (.[0] / 1000 | floor | strflocaltime("%d.%m. %H:%M"))} ]
    # „(Folgefrage)“: Der Besucher hat eine Folgefrage gestellt, die der Bot vorgeschlagen hatte.
    | (.[] | "\(.zeit)  \(.intent // "–") → \(.outcome)\(if .suggested then " (Folgefrage)" else "" end)"
             + "  \(.duration_ms) ms  [\(.visitor)]\n"
             + "  F: \(.question)\n"
             + "  A: \(.answer)\n"
             # Antworten aus der Wissensbasis: Stichwort (S) und Folgefragen (?), wenn es sie gibt.
             + (if .keyword then "  S: \(.keyword)\n" else "" end)
             + ((.suggestions // []) | map("  ?: \(.)\n") | add // "")),
      "\(length) Fragen von \(map(.visitor) | unique | length) Besuchern"
  '
