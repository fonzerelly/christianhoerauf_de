#!/usr/bin/env bash
# Misst den Produktionsbuild mit Lighthouse: Handy-Emulation mit gedrosselter CPU und
# simuliertem langsamen Netz (Lighthouse-Standard), alle vier Kategorien.
# Bericht als HTML und JSON nach reports/lighthouse/.
#
# Läuft im Docker-Image von Playwright und nutzt dessen Chromium:
#   npm run test:lighthouse
# Noch ohne Schwellen: Es wird nur gemessen und berichtet.
set -euo pipefail
cd "$(dirname "$0")/.."

port=4174
report_dir="reports/lighthouse"
mkdir -p "$report_dir"

npx vite build --logLevel warn
npx vite preview --host 127.0.0.1 --port "$port" --strictPort >/dev/null 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true' EXIT

# Warten, bis der Vorschau-Server antwortet.
node -e '
  const url = process.argv[1];
  const tryOnce = (left) => fetch(url).then(() => process.exit(0), () => {
    if (left === 0) { console.error("Vorschau-Server antwortet nicht"); process.exit(1); }
    setTimeout(() => tryOnce(left - 1), 200);
  });
  tryOnce(100);
' "http://127.0.0.1:$port/"

# Lighthouse findet den Browser über die Umgebungsvariable CHROME_PATH.
CHROME_PATH="$(node -p 'require("playwright-core").chromium.executablePath()')"
export CHROME_PATH

npx lighthouse "http://127.0.0.1:$port/" \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
  --output=html --output=json \
  --output-path="$report_dir/bericht" \
  --quiet

# Kurze Zusammenfassung der Punktzahlen.
node -e '
  const report = require(process.argv[1]);
  for (const category of Object.values(report.categories)) {
    console.log(`${category.title.padEnd(16)} ${Math.round(category.score * 100)}`);
  }
' "$PWD/$report_dir/bericht.report.json"
echo "Bericht: frontend/$report_dir/bericht.report.html"
