#!/usr/bin/env bash
# npm run dev: startet das lokale Backend (derselbe Bot wie im Lambda, Gemma in LM Studio) und
# danach Vite, das seine Fragen an dieses Backend schickt. Strg+C beendet beides.
#
# Aufruf:  npm run dev                  Gemma auf dem Mac mini
#          npm run dev -- --ziel dgx    Gemma auf der DGX Spark
# Gegen das ausgerollte Lambda (Adresse aus .env.local) wie früher: npm run dev:live
set -euo pipefail
cd "$(dirname "$0")/.."

port=8787
adresse="http://127.0.0.1:$port/"

# --inexact: entfernt nichts, etwa DSPy aus einem laufenden Training (wie backend/scripts/check.sh).
(cd ../backend && uv sync --locked --inexact --quiet)
# -u: Protokollzeilen sofort zeigen, nicht erst, wenn der Puffer voll ist.
(cd ../backend && exec uv run --no-sync python -u -m testsammlung.local_backend \
  --port "$port" "$@") &
backend=$!
trap 'kill "$backend" 2>/dev/null || true' EXIT

# Das Backend lauscht erst nach der Aufwärmfrage; das kann beim ersten Mal eine Weile dauern.
until curl -sf -o /dev/null "${adresse}lebenslauf"; do
  if ! kill -0 "$backend" 2>/dev/null; then
    echo "Das lokale Backend ist nicht gestartet (Meldung steht oben)." >&2
    exit 1
  fi
  sleep 1
done

VITE_ANSWER_URL="$adresse" npx vite
