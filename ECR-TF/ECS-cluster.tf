resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  tags = {
    Name = var.ecs_cluster_name
  }
}

resource "aws_cloudwatch_log_group" "ecs_app_logs" {
  name              = "/ecs/${var.ecs_task_family}"
  retention_in_days = 7

  tags = {
    Name = "${var.ecs_task_family}-logs"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.ecs_task_family
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory


  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = "${aws_ecr_repository.athena_repo.repository_url}:${var.image_tag}"
      essential = true
      secrets = [
        {
          name      = "DB_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:password::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:dbname::"
        },
        {
          name      = "DB_PORT"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:port::"
        }
      ]

      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "${aws_cloudwatch_log_group.ecs_app_logs.name}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      environment = [
        {
          name  = "APP_PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "S3_BUCKET_NAME"
          value = var.app_bucket_name
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.address
        }
      ]
    }
  ])

  tags = {
    Name = var.ecs_task_family
  }
}