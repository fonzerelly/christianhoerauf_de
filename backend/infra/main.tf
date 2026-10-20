data "aws_caller_identity" "current" {}

locals {
  name = "christianhoerauf-bot"
  cors_origins = concat(
    ["https://christianhoerauf.de", "https://www.christianhoerauf.de"],
    var.allow_localhost ? ["http://localhost:5173"] : [],
  )
}

# Geheimnis, aus dem der Bot das Tagessalz für die Besucherkürzel ableitet. Liegt im
# (verschlüsselten) State und als Umgebungsvariable des Lambdas.
resource "random_password" "visitor_secret" {
  length  = 48
  special = false
}

# --- Zähler und Zwischenspeicher (ADR backend/0003) ---
resource "aws_dynamodb_table" "bot" {
  name         = local.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# --- Protokoll: 30 Tage ---
resource "aws_cloudwatch_log_group" "bot" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 30
}

# --- Rolle mit minimalen Rechten ---
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "bot" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "bot" {
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.bot.arn}:*"]
  }

  statement {
    sid       = "UseTable"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.bot.arn]
  }

  # Modellaufruf über bedrock-mantle. Die Modell-ID steht nicht im ARN, sondern in der Anfrage;
  # eingeschränkt wird auf Projekte dieses Kontos in Frankfurt.
  statement {
    sid       = "InvokeModel"
    actions   = ["bedrock-mantle:CreateInference"]
    resources = ["arn:aws:bedrock-mantle:eu-central-1:${data.aws_caller_identity.current.account_id}:project/*"]
  }

  # Reine Berechtigung für Anmeldung mit Bedrock-API-Schlüssel; hat keinen Ressourcen-ARN.
  statement {
    sid       = "UseBedrockApiKey"
    actions   = ["bedrock-mantle:CallWithBearerToken"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "bot" {
  name   = local.name
  role   = aws_iam_role.bot.id
  policy = data.aws_iam_policy_document.bot.json
}

# --- Lambda ---
resource "aws_lambda_function" "bot" {
  function_name    = local.name
  role             = aws_iam_role.bot.arn
  runtime          = "python3.14"
  architectures    = ["arm64"]
  handler          = "bot.handler.handler"
  filename         = var.package_path
  source_code_hash = filebase64sha256(var.package_path)
  memory_size      = 256
  # Zwei Modellaufrufe mit je höchstens 10 s Zeitlimit.
  timeout = 30

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.bot.name
      VISITOR_SECRET = random_password.visitor_secret.result
      LLM_MODEL      = var.llm_model
    }
  }

  depends_on = [aws_cloudwatch_log_group.bot, aws_iam_role_policy.bot]
}

# --- Function URL mit CORS nur für die Seite ---
resource "aws_lambda_function_url" "bot" {
  function_name      = aws_lambda_function.bot.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = local.cors_origins
    # Der Preflight (OPTIONS) wird von der Function URL selbst beantwortet; die API erlaubt
    # in allow_methods höchstens sechs Zeichen je Eintrag, also kein "OPTIONS".
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 3600
  }
}

# Öffentliche Function URL: seit 2025 braucht es beide Berechtigungen.
resource "aws_lambda_permission" "url_invoke" {
  statement_id           = "AllowPublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.bot.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "url_invoke_function" {
  statement_id             = "AllowPublicInvokeViaFunctionUrl"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.bot.function_name
  principal                = "*"
  invoked_via_function_url = true
}

# Das Budget "Monatsbudget" (10 USD) wurde von Hand angelegt. Übernahme später mit:
#   tofu import aws_budgets_budget.monthly <Konto-ID>:Monatsbudget
# Die Budget-Aktion (IAM-Deny für den Modellaufruf bei 10 USD) kommt nach dem MVP.
