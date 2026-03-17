resource "aws_ecs_service" "Athena-ecs-service" {
  name            = var.ecs_name_service
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
      subnets         = [aws_subnet.private1-subnet1.id, aws_subnet.private2-subnet1.id]
      security_groups = [aws_security_group.ecs_sg.id]
      assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ecs_tg.arn
    container_name   = var.container_name
    container_port   = var.app_port
  }

