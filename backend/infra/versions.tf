terraform {
  required_version = ">= 1.13.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.66.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }

  # Lokales Backend: der State liegt als terraform.tfstate hier im Ordner und wird mit ins Repo
  # eingecheckt. Er ist verschlüsselt (TF_ENCRYPTION, gesetzt von tofu.sh aus der Passphrase).
  # Umzug in einen S3-Bucket (Versionierung, Sperrdatei), sobald die GitHub Action kommt.
}

provider "aws" {
  region = "eu-central-1"
}
