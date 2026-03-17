resource "aws_secretsmanager_secret" "db_secret" {
  name        = var.db_secret_name
  description = "Database credentials for Athena application"

  tags = {
    Name = var.db_secret_name
  }
}

resource "aws_secretsmanager_secret_version" "db_secret_version" {
  secret_id = aws_secretsmanager_secret.db_secret.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    dbname   = var.db_name
    port     = var.db_port
  })
}