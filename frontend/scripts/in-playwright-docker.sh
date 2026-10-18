#!/usr/bin/env bash
# Führt einen Befehl im offiziellen Docker-Image von Playwright aus (Bildtests, Lighthouse).
#
# Die Version des Images folgt der installierten Version von @playwright/test, die in
# package.json fest eingetragen ist. So passen Browser und Testbibliothek immer zusammen, und
# Bilder sehen auf jedem Rechner gleich aus.
#
# Aufruf aus frontend/:  ./scripts/in-playwright-docker.sh <befehl> [argumente]
set -euo pipefail
cd "$(dirname "$0")/.."

version="$(node -p 'require("./node_modules/@playwright/test/package.json").version')"
image="mcr.microsoft.com/playwright:v${version}-noble"

# --user: erzeugte Dateien gehören dem eigenen Benutzer, nicht root.
# --ipc=host: von Playwright empfohlen, sonst kann Chromium der Speicher ausgehen.
exec docker run --rm --init --ipc=host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e CI=1 \
  -v "$PWD:/work" -w /work \
  "$image" "$@"
