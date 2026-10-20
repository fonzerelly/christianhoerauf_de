#!/usr/bin/env bash
# Misst den Produktionsbuild mit Lighthouse: Handy-Emulation mit gedrosselter CPU und
# simuliertem langsamen Netz (Lighthouse-Standard), alle vier Kategorien.
# Bericht als HTML und JSON nach reports/lighthouse/.
#
# Läuft im Docker-Image von Playwright und nutzt dessen Chromium:
#   npm run test:lighthouse
# Schwellen (docs/frontend/adr/0005): Performance mindestens 95, Barrierefreiheit, Best Practices
# und SEO je 100, Total Blocking Time höchstens 200 ms. Die Kategorie "Agentic Browsing" wird
# nur berichtet. Liegt ein Wert darunter, endet das Skript mit Fehler.
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

# Lighthouse schwankt von Lauf zu Lauf (Total Blocking Time gemessen zwischen 140 und 280 ms).
# Deshalb drei Läufe; geprüft wird der Median jedes Werts.
runs=3
for run in $(seq 1 "$runs"); do
  npx lighthouse "http://127.0.0.1:$port/" \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --output=html --output=json \
    --output-path="$report_dir/bericht-$run" \
    --quiet
done

# Punktzahlen ausgeben und gegen die Schwellen prüfen.
node -e '
  const reports = process.argv.slice(1).map((file) => require(file));
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const minimumScores = { performance: 95, accessibility: 100, "best-practices": 100, seo: 100 };
  const maximumBlockingMillis = 200;
  const failures = [];
  for (const [id, category] of Object.entries(reports[0].categories)) {
    const scores = reports.map((report) => Math.round(report.categories[id].score * 100));
    const score = median(scores);
    const minimum = minimumScores[id];
    const verdict = minimum === undefined ? "(nur berichtet)" : score >= minimum ? "ok" : `unter ${minimum}`;
    console.log(`${category.title.padEnd(16)} ${String(score).padStart(3)}  ${verdict}   (Läufe: ${scores.join(", ")})`);
    if (minimum !== undefined && score < minimum) failures.push(category.title);
  }
  const blocking = reports.map((report) => Math.round(report.audits["total-blocking-time"].numericValue));
  const blockingMillis = median(blocking);
  const blockingOk = blockingMillis <= maximumBlockingMillis;
  console.log(`${"Total Blocking".padEnd(16)} ${blockingMillis} ms  ${blockingOk ? "ok" : `über ${maximumBlockingMillis} ms`}   (Läufe: ${blocking.join(", ")} ms)`);
  if (!blockingOk) failures.push("Total Blocking Time");
  if (failures.length > 0) {
    console.error(`Schwelle verfehlt (Median aus ${reports.length} Läufen): ${failures.join(", ")}`);
    process.exit(1);
  }
' $(for run in $(seq 1 "$runs"); do echo "$PWD/$report_dir/bericht-$run.report.json"; done)
echo "Berichte: frontend/$report_dir/bericht-1.report.html bis bericht-$runs.report.html"
