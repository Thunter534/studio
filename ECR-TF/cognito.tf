resource "aws_security_group" "n8n_ecs_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = "Security group for n8n ECS tasks"

  ingress {
    description     = "n8n traffic from ALB"
    from_port       = var.n8n_port
    to_port         = var.n8n_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.n8n_ecs_sg_name
  }
}




