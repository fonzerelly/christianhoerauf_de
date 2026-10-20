#!/usr/bin/env bash
# Führt OpenTofu für backend/infra aus: mit dem installierten `tofu`, sonst im offiziellen
# Docker-Image (feste Version). Der State wird mit der Passphrase aus der Umgebungsvariable
# CHRISTIANHOERAUF_TOFU_PASSPHRASE verschlüsselt (OpenTofu-State-Verschlüsselung, pbkdf2 + AES-GCM).
#
# Aufruf:  CHRISTIANHOERAUF_TOFU_PASSPHRASE=... ./tofu.sh plan
set -euo pipefail
cd "$(dirname "$0")"

TOFU_IMAGE="ghcr.io/opentofu/opentofu:1.13.1"

if [ -z "${CHRISTIANHOERAUF_TOFU_PASSPHRASE:-}" ]; then
  echo "Fehler: CHRISTIANHOERAUF_TOFU_PASSPHRASE ist nicht gesetzt." >&2
  exit 1
fi
if [ "${#CHRISTIANHOERAUF_TOFU_PASSPHRASE}" -lt 16 ]; then
  echo "Fehler: Die Passphrase muss mindestens 16 Zeichen lang sein." >&2
  exit 1
fi
# Die Passphrase landet in HCL-Text; diese Zeichen würden ihn zerbrechen.
if [[ "$CHRISTIANHOERAUF_TOFU_PASSPHRASE" == *[\"\\\$]* ]]; then
  echo "Fehler: Die Passphrase darf kein \", \\ und \$ enthalten." >&2
  exit 1
fi

# `encryption` darf keine Variablen nutzen, deshalb kommt die Konfiguration über TF_ENCRYPTION.
export TF_ENCRYPTION
TF_ENCRYPTION=$(cat <<HCL
key_provider "pbkdf2" "main" {
  passphrase = "${CHRISTIANHOERAUF_TOFU_PASSPHRASE}"
}
method "aes_gcm" "main" {
  keys = key_provider.pbkdf2.main
}
state {
  method   = method.aes_gcm.main
  enforced = true
}
plan {
  method   = method.aes_gcm.main
  enforced = true
}
HCL
)

if command -v tofu >/dev/null 2>&1; then
  exec tofu "$@"
fi

# Docker: backend/ einbinden (das Paket liegt in ../build), als eigener Benutzer, damit die
# Dateien nicht root gehören. AWS-Zugangsdaten kommen aus der Umgebung und aus ~/.aws (nur lesen).
docker_aws_env=()
for name in AWS_PROFILE AWS_REGION AWS_DEFAULT_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN; do
  if [ -n "${!name:-}" ]; then docker_aws_env+=(-e "$name"); fi
done
exec docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp/home -e TF_ENCRYPTION \
  "${docker_aws_env[@]+"${docker_aws_env[@]}"}" \
  -v "$HOME/.aws:/tmp/home/.aws:ro" \
  -v "$(cd .. && pwd):/workspace" -w /workspace/infra \
  "$TOFU_IMAGE" "$@"
