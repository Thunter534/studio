#--------- security group for ecs ---------

resource "aws_security_group" "app_ecs_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = " security group for the main application ECS tasks"

  ingress {
    description      = "APP traffic from ALB"
    from_port        = var.app_port
    to_port          = var.app_port
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
    self             = false
    prefix_list_ids  = []
    security_groups  = [aws_security_group.alb_sg.id]
  }
  /*
  ingress {
    description     = "Optional admin/test access from Jenkins"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [data.aws_security_group.jenkins_sg.id]
  }

*/
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.app_ecs_sg_name
  }
}

# -------- security group for n8n ---------
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
#--------- security group for RDS ---------

resource "aws_security_group" "rds_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = " security group for RDS"

  ingress {
    description     = "TLS from VPC"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app_ecs_sg.id]
  }
/*
  ingress {
    description     = " n8n access from Jenkins"
    from_port       = var.n8n_port
    to_port         = var.n8n_port
    protocol        = "tcp"
    security_groups = [data.aws_security_group.jenkins_sg.id]
  }
*/
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.rds_sg_name
  }
}

# --------- security group for ALB ---------

resource "aws_security_group" "alb_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = "security group for ALB"

  ingress {
    description      = "HTTP from internet"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = "HTTPS from internet"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.alb_sg_name
  }
}

resource "aws_security_group" "efs_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = "Security group for EFS used by n8n"

  ingress {
    description     = "Allow NFS from n8n ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.n8n_ecs_sg.id]
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