terraform {
  backend "s3" {
    bucket         = "terraform-state-athena"
    region         = "us-east-1"
    key            = "Athena/Jenkins-Server-TF/terraform.tfstate"
    dynamodb_table = "terraform-lock-Athena"
    encrypt        = true
  }
  required_version = ">=0.13.0"
  required_providers {
    aws = {
      version = ">= 2.7.0"
      source  = "hashicorp/aws"
    }
  }
}
