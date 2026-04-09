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

      authorization_config {
        access_point_id = aws_efs_access_point.n8n_access_point.id
        iam             = "DISABLED"
      }
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
          value = "https"
        },

        {
          name = "N8N_SSL_KEY"
          value = tostring(var.n8n_port)
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
      aws_subnet.private1_subnet1.id
    ]
    security_groups  = [aws_security_group.n8n_ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.n8n_tg.arn
    container_name   = var.n8n_container_name
    container_port   = var.n8n_port
  }

  depends_on = [
    aws_lb_listener_rule.n8n_host_rule,
    aws_lb_listener_rule.n8n_http_rule,
    aws_efs_mount_target.n8n_mount_target_1,
    aws_efs_mount_target.n8n_mount_target_2
  ]
}
