resource "aws_security_group" "efs_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = "Security group for EFS used by n8n"

  ingress {
    description     = "Allow NFS from n8n ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.efs_sg_name
  }
}

resource "aws_efs_file_system" "n8n_efs" {
  creation_token = var.efs_creation_token
  encrypted      = true

  tags = {
    Name = var.efs_name
  }
}

resource "aws_efs_mount_target" "n8n_mount_target_1" {
  file_system_id  = aws_efs_file_system.n8n_efs.id
  subnet_id       = aws_subnet.private1_subnet1.id
  security_groups = [aws_security_group.efs_sg.id]
}

resource "aws_efs_mount_target" "n8n_mount_target_2" {
  file_system_id  = aws_efs_file_system.n8n_efs.id
  subnet_id       = aws_subnet.private2_subnet1.id
  security_groups = [aws_security_group.efs_sg.id]
}