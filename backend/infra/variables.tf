variable "package_path" {
  description = "Das Lambda-Paket, gebaut mit backend/scripts/build_package.sh."
  type        = string
  default     = "../build/lambda.zip"
}

variable "allow_localhost" {
  description = "Erlaubt zusätzlich http://localhost:5173 (Vite-Entwicklungsserver) für CORS."
  type        = bool
  default     = false
}

variable "llm_model" {
  description = "Modell-ID bei Bedrock (bedrock-mantle)."
  type        = string
  default     = "google.gemma-4-26b-a4b"
}
