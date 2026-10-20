#!/usr/bin/env bash
# Misst den Kaltstart des Pakets lokal, ohne AWS: offizielles Lambda-Basis-Image mit dem
# eingebauten Runtime Interface Emulator (RIE). Jede Messung startet einen frischen Container,
# das Paket aus build/lambda.zip wird nach /var/task entpackt und einmal aufgerufen.
#
# Aufruf:  scripts/measure_cold_start.sh [Anzahl Messungen, Standard 5]
#
# Gemessen wird mit x86_64, weil der Rechner x86_64 ist (arm64 ginge nur emuliert und wäre
# verfälscht). Das Paket enthält nur reines Python, ist also architekturunabhängig. Die Zeiten sind
# Richtwerte: echte Lambda-Kaltstarts kommen noch um das Anlegen der Umgebung hinzu.
set -euo pipefail
cd "$(dirname "$0")/.."

runs="${1:-5}"
image="public.ecr.aws/lambda/python:3.14"
name="coldstart-$$"
workdir="$(mktemp -d)"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  rm -rf "$workdir"
}
trap cleanup EXIT

[ -f build/lambda.zip ] || scripts/build_package.sh >/dev/null
unzip -q build/lambda.zip -d "$workdir"
echo "Image: $image (x86_64, RIE eingebaut), $runs Messungen"

for i in $(seq "$runs"); do
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" --platform linux/amd64 -p 127.0.0.1:19000:8080 \
    -v "$workdir:/var/task:ro" "$image" bot.handler.handler >/dev/null
  # Warten, bis der Emulator Anfragen annimmt (frühestens nach dem ersten erfolgreichen Aufruf).
  for _ in $(seq 50); do
    if curl -s -o /dev/null -XPOST "http://127.0.0.1:19000/2015-03-31/functions/function/invocations" \
         -d '{}'; then break; fi
    sleep 0.2
  done
  # Der Emulator meldet die Init-Phase (Python starten, Handler importieren) und den Aufruf getrennt.
  logs=$(docker logs "$name" 2>&1)
  init_ms=$(grep -o 'INIT REPORT(durationMs: [0-9.]*' <<<"$logs" | grep -o '[0-9.]*$')
  invoke_ms=$(grep -o 'INVOKE RTDONE(.*duration: [0-9.]*' <<<"$logs" | grep -o '[0-9.]*$')
  echo "Messung $i: Init ${init_ms} ms, erster Aufruf ${invoke_ms} ms"
  docker rm -f "$name" >/dev/null
done
