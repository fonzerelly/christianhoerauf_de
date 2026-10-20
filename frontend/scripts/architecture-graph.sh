#!/usr/bin/env bash
# Zeichnet die Abhängigkeiten unter src/ als Graphen und legt sie als Webseite nach
# reports/architektur/index.html. dependency-cruiser liefert die Graphen im Graphviz-Format
# (dot), gezeichnet werden sie beim Öffnen im Browser (Graphviz als WebAssembly aus dem Netz,
# @viz-js/viz). Eine lokale Graphviz-Installation ist nicht nötig. Drei Ansichten:
#   1. Schichten  (-T archi: domain, animation, rendering, …)
#   2. Ordner     (-T ddot:  z. B. domain/maze, domain/text)
#   3. Module     (-T dot:   jede Datei einzeln)
set -euo pipefail
cd "$(dirname "$0")/.."

OUTPUT_DIR=reports/architektur
mkdir -p "$OUTPUT_DIR"

graph() {
  npx depcruise src --config .dependency-cruiser.cjs --output-type "$1"
}

section() {
  local title=$1 type=$2
  echo "  <h2>$title</h2>"
  echo "  <div class=\"graph\"></div>"
  echo "  <script type=\"text/vnd.graphviz\">"
  graph "$type"
  echo "  </script>"
}

{
  cat <<'HTML'
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Abhängigkeiten im Frontend</title>
  <style>
    body { font-family: sans-serif; margin: 1rem; background: #fff; color: #222; }
    .graph { margin-bottom: 3rem; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Abhängigkeiten unter src/</h1>
  <p>Ein Pfeil A → B heißt: A importiert B. Hohle Pfeilspitze: nur Typen werden importiert.
     Erzeugt mit <code>npm run graph:architecture</code>.</p>
HTML
  section "1. Schichten" archi
  section "2. Ordner" ddot
  section "3. Module" dot
  cat <<'HTML'
  <script type="module">
    import { instance } from "https://cdn.jsdelivr.net/npm/@viz-js/viz@3.30.0/+esm";
    const viz = await instance();
    for (const source of document.querySelectorAll('script[type="text/vnd.graphviz"]')) {
      source.previousElementSibling.append(viz.renderSVGElement(source.textContent));
    }
  </script>
</body>
</html>
HTML
} >"$OUTPUT_DIR/index.html"

echo "Geschrieben: $OUTPUT_DIR/index.html"
