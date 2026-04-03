resource "aws_cognito_user_pool" "athena_users" {
  name = var.cognito_user_pool_name

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  tags = {
    Name = var.cognito_user_pool_name
  }
}

resource "aws_cognito_user_pool_client" "athena_client" {
  name         = var.cognito_user_pool_client_name
  user_pool_id = aws_cognito_user_pool.athena_users.id

  generate_secret = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = [
    "http://localhost:${var.app_port}/auth/callback",
    "https://${var.subdomain_name}/auth/callback"
  ]
  default_redirect_uri = "http://localhost:${var.app_port}/auth/callback"

  logout_urls = [
    "http://localhost:${var.app_port}",
    "https://${var.subdomain_name}"
  ]

  read_attributes = [
    "email",
    "name",
    "profile"
  ]

  write_attributes = [
    "email",
    "name"
  ]
}

resource "aws_cognito_user_pool_domain" "athena_domain" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.athena_users.id
}

resource "aws_cognito_user_group" "teacher" {
  name         = "teacher"
  user_pool_id = aws_cognito_user_pool.athena_users.id
}

resource "aws_cognito_user_group" "parent" {
  name         = "parent"
  user_pool_id = aws_cognito_user_pool.athena_users.id
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.athena_users.id
}
