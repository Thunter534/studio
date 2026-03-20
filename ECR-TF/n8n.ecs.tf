resource "aws_cloudwatch_log_group" "n8n_logs" {
  name              = "/ecs/${var.n8n_task_family}"
  retention_in_days = 7

  tags = {
    Name = "${var.n8n_task_family}-logs"
  }
}

resource "aws_ecs_task_definition" "n8n" {
  family                   = var.n8n_task_family
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.n8n_cpu
  memory                   = var.n8n_memory

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  volume {
    name = "n8n-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.n8n_efs.id
      transit_encryption = "ENABLED"

      root_directory = "/"
    }
  }

  container_definitions = jsonencode([
    {
      name      = var.n8n_container_name
      image     = var.n8n_image
      essential = true

      portMappings = [
        {
          containerPort = var.n8n_port
          hostPort      = var.n8n_port
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "n8n-data"
          containerPath = "/home/node/.n8n"
          readOnly      = false
        }
      ]

      environment = [
        {
          name  = "N8N_HOST"
          value = "0.0.0.0"
        },
        {
          name  = "N8N_PORT"
          value = tostring(var.n8n_port)
        },
        {
          name  = "N8N_PROTOCOL"
          value = "http"
        },
        {
          name  = "DB_TYPE"
          value = "postgresdb"
        },
        {
          name  = "DB_POSTGRESDB_HOST"
          value = aws_db_instance.main.address
        }
      ]

      secrets = [
        {
          name      = "DB_POSTGRESDB_USER"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:username::"
        },
        {
          name      = "DB_POSTGRESDB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:password::"
        },
        {
          name      = "DB_POSTGRESDB_DATABASE"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:dbname::"
        },
        {
          name      = "DB_POSTGRESDB_PORT"
          valueFrom = "${aws_secretsmanager_secret.db_secret.arn}:port::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.n8n_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = var.n8n_task_family
  }
}

resource "aws_ecs_service" "n8n_service" {
  name            = var.n8n_service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets = [
      aws_subnet.private1_subnet1.id,
      aws_subnet.private2_subnet1.id
    ]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.n8n_tg.arn
    container_name   = var.n8n_container_name
    container_port   = var.n8n_port
  }

  depends_on = [aws_lb_listener.n8n_http]
}