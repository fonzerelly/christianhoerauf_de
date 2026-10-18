#!/usr/bin/env bash
# Entsperrt die mit git-crypt verschlüsselten Ordner (docs/, corporate-identity/).
#
# Der Schlüssel kommt base64-kodiert aus der Umgebungsvariablen CHRISTIANHOERAUF_GIT_CRYPT_KEY.
# Er liegt nur kurz in einer Datei, die nur der eigene Benutzer lesen darf, und wird danach
# sofort gelöscht – auch wenn git-crypt scheitert.
#
# Aufruf (von überall):  scripts/entsperren.sh
set -euo pipefail

if [ -z "${CHRISTIANHOERAUF_GIT_CRYPT_KEY:-}" ]; then
  echo "Fehler: CHRISTIANHOERAUF_GIT_CRYPT_KEY ist nicht gesetzt (Schlüssel steht im Passwortspeicher)." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

key_file="$(mktemp)"
trap 'rm -f "$key_file"' EXIT
chmod 600 "$key_file"

echo "$CHRISTIANHOERAUF_GIT_CRYPT_KEY" | base64 -d > "$key_file"
git-crypt unlock "$key_file"
echo "Entsperrt: docs/ und corporate-identity/ sind lesbar."
