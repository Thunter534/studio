data "aws_security_group" "jenkins_sg" {
  filter {
    name   = "tag:Name"
    values = [var.security-group-name]
  }
}

#--------- security group for ecs ---------

resource "aws_security_group" "ecs_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = " security group for ECS"

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

 ingress {
     description     = "Optional admin/test access from Jenkins"
     from_port       = var.app_port
     to_port         = var.app_port
     protocol        = "tcp"
     security_groups = [data.aws_security_group.jenkins_sg.id]
   }
  

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.ecs_sg_name
  }
}

#--------- security group for RDS ---------

resource "aws_security_group" "rds_sg" {
  vpc_id      = data.aws_vpc.vpc.id
  description = " security group for RDS"

  ingress {
      description      = "TLS from VPC"
      from_port        = var.db_port
      to_port          = var.db_port
      protocol         = "tcp"
      security_groups  = [aws_security_group.ecs_sg.id]
    }
ingress {
     description     = " DB admin access from Jenkins"
     from_port       = var.db_port
     to_port         = var.db_port
     protocol        = "tcp"
     security_groups = [data.aws_security_group.jenkins_sg.id]
   }

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
  description = " security group for ALB"

  ingress = [
    for port in [80, 443] : {
      description      = "HTTP/HTTPS from internet"
      from_port        = port
      to_port          = port
      protocol         = "tcp"
      ipv6_cidr_blocks = ["::/0"]
      self             = false
      prefix_list_ids  = []
      cidr_blocks      = ["0.0.0.0/0"]
    }
  ]

  egress {
    description = "Outbound rule to ECS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.alb_sg_name
  }
}