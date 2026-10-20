output "function_url" {
  description = "Adresse für POST {\"question\": ...} (das Frontend trägt sie ein)."
  value       = aws_lambda_function_url.bot.function_url
}
