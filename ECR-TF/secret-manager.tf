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

resource "aws_secretsmanager_secret" "n8n_db_secret" {
  name        = var.n8n_db_secret_name
  description = "Database credentials for the n8n service"

  tags = {
    Name = var.n8n_db_secret_name
  }
}

resource "aws_secretsmanager_secret_version" "n8n_db_secret_version" {
  secret_id = aws_secretsmanager_secret.n8n_db_secret.id

  secret_string = jsonencode({
    username = var.n8n_db_username
    password = var.n8n_db_password
    dbname   = var.n8n_db_name
    port     = var.db_port
  })
}
