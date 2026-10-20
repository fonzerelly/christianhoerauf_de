#!/usr/bin/env bash
# Baut das Lambda-Paket build/lambda.zip: Linux, arm64, Python 3.14, nur Laufzeitabhängigkeiten
# (Abschnitt `dependencies` in pyproject.toml; weder Entwicklungswerkzeuge noch DSPy) plus src/bot.
#
# Aufruf:  scripts/build_package.sh [--with PAKET==VERSION]...
# `--with` nimmt ein Paket nur für diese Messung hinein (z. B. um zu sehen, wie groß boto3 würde).
# Es ändert weder pyproject.toml noch die Lock-Datei.
set -euo pipefail
cd "$(dirname "$0")/.."

extra_requirements=()
while [ $# -gt 0 ]; do
  case "$1" in
    --with) extra_requirements+=("$2"); shift 2 ;;
    *) echo "Unbekannte Option: $1" >&2; exit 2 ;;
  esac
done

rm -rf build
mkdir -p build/package

# Laufzeitabhängigkeiten exakt wie in uv.lock, ohne Gruppen und ohne das Projekt selbst.
uv export --frozen --no-dev --no-emit-project --no-hashes --quiet > build/requirements.txt
for requirement in "${extra_requirements[@]+"${extra_requirements[@]}"}"; do
  echo "$requirement" >> build/requirements.txt
done

if [ -s build/requirements.txt ] && grep -qv '^#' build/requirements.txt; then
  # Räder für Lambda (Amazon Linux 2023, arm64), egal auf welchem Rechner gebaut wird.
  uv pip install --quiet --target build/package \
    --python-platform aarch64-manylinux2014 --python-version 3.14 \
    --only-binary :all: --requirements build/requirements.txt
fi

cp -r src/bot build/package/bot
# Ohne Zwischenspeicher und ohne doc.md: gehören nicht ins Paket.
find build/package -name __pycache__ -type d -prune -exec rm -rf {} +
find build/package/bot -name doc.md -delete

# Feste Reihenfolge und Zeitstempel -> gleiche Eingabe ergibt dieselbe Datei.
(cd build/package && find . -type f | sort | zip -q -X ../lambda.zip -@)

zip_bytes=$(stat -c %s build/lambda.zip)
unzipped_kib=$(du -sk build/package | cut -f1)
echo "Paket:        build/lambda.zip"
echo "ZIP:          $((zip_bytes / 1024)) KiB"
echo "Entpackt:     ${unzipped_kib} KiB (Grenze bei Lambda: 250 MB entpackt, 50 MB als ZIP-Upload)"
echo "Abhängigkeiten:"
grep -v '^#' build/requirements.txt | sed 's/^/  /' || true

# Sicherung: DSPy gehört nie ins Paket (ADR backend/0002).
if find build/package -maxdepth 1 -iname 'dspy*' | grep -q .; then
  echo "FEHLER: dspy ist im Paket." >&2
  exit 1
fi
echo "dspy im Paket: nein"
