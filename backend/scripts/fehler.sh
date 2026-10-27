#!/usr/bin/env bash
# Fehlerbericht aus dem CloudWatch-Protokoll des Bots: Aufrufe, Fehler und Zeitüberschreitungen,
# feste Antworten wegen Modellausfall oder Kostengrenze.
# Aufruf:  scripts/fehler.sh [TAGE]     (Standard: die letzten 2 Tage)
# Nutzt die AWS-Zugangsdaten der Umgebung; nur lesender Zugriff.
set -euo pipefail

tage="${1:-2}"

# Ohne Filter: alle Zeilen des Zeitraums. Bei dem Verkehr der Seite sind das wenige.
aws logs filter-log-events \
  --region eu-central-1 \
  --log-group-name /aws/lambda/christianhoerauf-bot \
  --start-time "$(( ($(date +%s) - tage * 86400) * 1000 ))" \
  --query 'events[].[timestamp,message]' \
  --output json |
  TZ=Europe/Berlin jq -r '
    def zeit: . / 1000 | floor | strflocaltime("%d.%m. %H:%M");
    def eingerueckt: sub("\\s+$"; "") | split("\n") | map("  " + .) | join("\n");
    def json_eintrag: [fromjson? | objects] | first;

    [ .[] | {zeit: (.[0] | zeit), text: .[1], eintrag: (.[1] | json_eintrag)} ] as $zeilen

    # REPORT-Zeilen schreibt die Lambda-Laufzeit nach jedem Aufruf.
    | [ $zeilen[] | select(.text | startswith("REPORT")) | .text ] as $aufrufe

    # Fehler stehen nie in den JSON-Zeilen des Bots, sondern in Zeilen der Laufzeit.
    | [ $zeilen[] | select(.eintrag == null)
                  | select(.text | test("\\[ERROR\\]|Traceback|Task timed out|Status: (error|timeout)")) ]
      as $fehler

    | [ $zeilen[] | select(.eintrag.outcome | IN("unavailable", "limit", "visitor_limit"))
                  | {zeit, outcome: .eintrag.outcome, question: .eintrag.question} ] as $grenzen

    | if ($aufrufe | length) == 0 then "Aufrufe: 0"
      else "Aufrufe: \($aufrufe | length), "
         + "davon \([$aufrufe[] | select(contains("Init Duration"))] | length) mit Kaltstart; "
         + "längster \([$aufrufe[] | capture("\tDuration: (?<ms>[0-9.]+) ms").ms | tonumber] | max | round) ms, "
         + "höchster Speicher \([$aufrufe[] | capture("Max Memory Used: (?<mb>[0-9]+) MB").mb | tonumber] | max) MB"
      end,
      "",
      if ($fehler | length) == 0 then "Fehler: keine"
      else "Fehler: \($fehler | length)", ($fehler[] | .zeit, (.text | eingerueckt))
      end,
      "",
      if ($grenzen | length) == 0 then "Feste Antworten wegen Ausfall oder Grenze: keine"
      else "Feste Antworten wegen Ausfall oder Grenze: \($grenzen | length)",
           ($grenzen[] | "\(.zeit)  \(.outcome)  „\(.question)“")
      end
  '
