#!/usr/bin/env bash
# Bündelt zeichne.ts mit rolldown zu einer Node-Datei und führt sie aus.
set -euo pipefail
cd "$(dirname "$0")/../.."
BUNDLE=$(mktemp --suffix=.mjs)
trap 'rm -f "$BUNDLE"' EXIT
npx rolldown experimente/ersatzglyphe/zeichne.ts --platform node --format esm --file "$BUNDLE" >/dev/null
node "$BUNDLE"
