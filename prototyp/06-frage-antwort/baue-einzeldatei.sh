#!/usr/bin/env bash
# Fügt index.html und alle Skripte zu EINER HTML-Datei zusammen. Es entstehen zwei Fassungen:
#
#   einzeldatei/labyrinth-prototyp-6.html   der Prototyp mit Reglern, zum Ausprobieren am Handy
#   ../live/index.html                      die Besucherfassung für christianhoerauf.de
#
# In beiden wird jede Zeile <script src="datei.js"></script> durch den Inhalt der Datei
# ersetzt. Die Besucherfassung bekommt zusätzlich, alles aus dem Ordner besucher/:
#   - hinter config.js die Datei config-besucher.js (überschreibt Texte, versteckt die Regler)
#   - statt der <title>-Zeile den Inhalt von kopf.html (Titel, Beschreibung)
#   - gleich hinter <body> den Inhalt von inhalt.html (Text für Screenreader, noscript-Hinweis)
#
# Aufruf (von überall):  ./baue-einzeldatei.sh
set -euo pipefail

prototype_dir="$(cd "$(dirname "$0")" && pwd)"
visitor_dir="$prototype_dir/besucher"
prototype_target="$prototype_dir/einzeldatei/labyrinth-prototyp-6.html"
visitor_target="$(cd "$prototype_dir/.." && pwd)/live/index.html"

script_line='^[[:space:]]*<script src="([^"]+)"></script>[[:space:]]*$'
title_line='^[[:space:]]*<title>.*</title>[[:space:]]*$'
body_line='^<body>[[:space:]]*$'

# Gibt eine Skript-Datei als eingebettetes <script> aus.
print_inline_script() {
  local script_path="$1"
  echo "  <script>"
  echo "// ===== $(basename "$script_path") ====="
  cat "$script_path"
  echo "  </script>"
}

# Schreibt eine Fassung. variant ist "prototyp" oder "besucher".
build_single_file() {
  local target="$1" variant="$2" line script_file
  mkdir -p "$(dirname "$target")"

  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ $script_line ]]; then
      script_file="${BASH_REMATCH[1]}"
      print_inline_script "$prototype_dir/$script_file"
      if [ "$variant" = "besucher" ] && [ "$script_file" = "config.js" ]; then
        print_inline_script "$visitor_dir/config-besucher.js"
      fi
    elif [ "$variant" = "besucher" ] && [[ "$line" =~ $title_line ]]; then
      cat "$visitor_dir/kopf.html"
    elif [ "$variant" = "besucher" ] && [[ "$line" =~ $body_line ]]; then
      printf '%s\n' "$line"
      cat "$visitor_dir/inhalt.html"
    else
      printf '%s\n' "$line"
    fi
  done < "$prototype_dir/index.html" > "$target"

  if grep -q '<script src=' "$target"; then
    echo "Fehler: In $target wird noch ein Skript von außen geladen." >&2
    exit 1
  fi
  echo "Geschrieben: $target ($(wc -c < "$target") Bytes)"
}

build_single_file "$prototype_target" prototyp
build_single_file "$visitor_target" besucher

# Die Besucherfassung muss ihre drei Zutaten wirklich bekommen haben.
for expected in '<title>Christian Hörauf</title>' 'config-besucher.js' 'class="visuallyHidden">Hier entsteht'; do
  if ! grep -q "$expected" "$visitor_target"; then
    echo "Fehler: In $visitor_target fehlt: $expected" >&2
    exit 1
  fi
done
