output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.alb.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.athena_repo.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.athena_ecs_service.name
}
/*
output "rds_endpoint" {
  description = "RDS endpoint address"
  value       = aws_db_instance.athena_db_instance.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.athena_db_instance.port
}
*/
output "db_secret_arn" {
  description = "Secrets Manager ARN for database credentials"
  value       = aws_secretsmanager_secret.db_secret.arn
}

/*
output "app_bucket_name" {
  description = "S3 bucket used by the application"
  value       = aws_s3_bucket.storage-s3.bucket
}
*/