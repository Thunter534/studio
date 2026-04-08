data "aws_region" "current" {}

locals {
  env_local_path        = "${path.root}/../.env.local"
  existing_env_local    = try(file(local.env_local_path), "")
  cognito_app_base_url = startswith(var.subdomain_name, "http://") || startswith(var.subdomain_name, "https://") ? trimsuffix(var.subdomain_name, "/") : "https://${var.subdomain_name}"
  cognito_redirect_uri = "${local.cognito_app_base_url}/auth/callback"
  cognito_logout_uri   = local.cognito_app_base_url
  cognito_domain_url   = "https://${aws_cognito_user_pool_domain.athena_domain.domain}.auth.${data.aws_region.current.region}.amazoncognito.com"

  updated_env_local = regexreplace(
    regexreplace(
      regexreplace(
        regexreplace(
          regexreplace(
            regexreplace(
              regexreplace(
                regexreplace(local.existing_env_local, "(?m)^COGNITO_ISSUER=.*$", "COGNITO_ISSUER=https://cognito-idp.${data.aws_region.current.region}.amazonaws.com/${aws_cognito_user_pool.athena_users.id}"),
                "(?m)^COGNITO_CLIENT_ID=.*$",
                "COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.athena_client.id}"
              ),
              "(?m)^NEXT_PUBLIC_COGNITO_DOMAIN=.*$",
              "NEXT_PUBLIC_COGNITO_DOMAIN=${local.cognito_domain_url}"
            ),
            "(?m)^NEXT_PUBLIC_COGNITO_CLIENT_ID=.*$",
            "NEXT_PUBLIC_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.athena_client.id}"
          ),
          "(?m)^NEXT_PUBLIC_COGNITO_REDIRECT_URI=.*$",
          "NEXT_PUBLIC_COGNITO_REDIRECT_URI=${local.cognito_redirect_uri}"
        ),
        "(?m)^NEXT_PUBLIC_COGNITO_LOGOUT_URI=.*$",
        "NEXT_PUBLIC_COGNITO_LOGOUT_URI=${local.cognito_logout_uri}"
      ),
      "(?m)^OIDC_REDIRECT_URI=.*$",
      "OIDC_REDIRECT_URI=${local.cognito_redirect_uri}"
    ),
    "(?m)^OIDC_POST_LOGOUT_REDIRECT_URI=.*$",
    "OIDC_POST_LOGOUT_REDIRECT_URI=${local.cognito_logout_uri}"
  )
}

resource "local_file" "cognito_env" {
  filename = local.env_local_path

  content = local.updated_env_local
}
