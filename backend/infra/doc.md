# infra

OpenTofu (Version 1.13.1, AWS-Provider 6.66.0, Random-Provider 3.9.1) für alles, was das Backend bei AWS braucht. Region `eu-central-1`.

## tofu.sh

Führt OpenTofu aus: mit dem installierten `tofu`, sonst im Docker-Image `ghcr.io/opentofu/opentofu:1.13.1` (backend/ wird nach `/workspace` eingebunden, `~/.aws` nur lesend, AWS-Variablen aus der Umgebung werden durchgereicht). Prüft vorher `CHRISTIANHOERAUF_TOFU_PASSPHRASE` (gesetzt, mindestens 16 Zeichen, ohne `"`, `\` und `$`) und baut daraus die State-Verschlüsselung (PBKDF2 plus AES-GCM, für State und Plan, `enforced`), die als `TF_ENCRYPTION` an OpenTofu geht. Der State `terraform.tfstate` liegt im Ordner und wird eingecheckt.

## Dateien

| Datei | Inhalt |
|---|---|
| `versions.tf` | Versionen von OpenTofu und Providern, Region. Lokales Backend. |
| `variables.tf` | `package_path` (Standard `../build/lambda.zip`), `allow_localhost` (CORS für `http://localhost:5173`, Standard aus), `llm_model`. |
| `main.tf` | `random_password.visitor_secret` (Geheimnis für das Tagessalz); `aws_dynamodb_table.bot` (Schlüssel `pk`, pro Zugriff bezahlt, TTL-Spalte `expires_at`); `aws_cloudwatch_log_group.bot` (30 Tage); Rolle `christianhoerauf-bot` mit Rechten nur für Logs dieser Gruppe, `GetItem`/`PutItem`/`UpdateItem` auf diese Tabelle, `bedrock-mantle:CreateInference` auf Projekte dieses Kontos in Frankfurt und `bedrock-mantle:CallWithBearerToken`; `aws_lambda_function.bot` (arm64, Python 3.14, Handler `bot.handler.handler`, 256 MB, 30 s, Umgebung `TABLE_NAME`, `VISITOR_SECRET`, `LLM_MODEL`); `aws_lambda_function_url.bot` (ohne Anmeldung, CORS für `https://christianhoerauf.de` und `https://www.christianhoerauf.de`, Methode POST, Header `content-type`) samt den zwei öffentlichen Berechtigungen. Kommentar zum späteren Import des Budgets. |
| `outputs.tf` | `function_url`. |
| `.terraform.lock.hcl` | Festgehaltene Provider-Prüfsummen (eingecheckt). |
