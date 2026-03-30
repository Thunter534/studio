resource "aws_db_subnet_group" "athena_db" {
  name = var.db_subnet_group_name
  subnet_ids = [
    aws_subnet.private1_subnet1.id,
    aws_subnet.private2_subnet1.id
  ]

  tags = {
    Name = var.db_subnet_group_name
  }
}

resource "aws_db_instance" "athena_intance" {
  identifier        = var.db_instance_identifier
  allocated_storage = var.db_allocated_storage
  engine            = var.db_engine
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  availability_zone = var.availability_zone
  db_name           = var.db_name
  username          = var.db_username
  password          = var.db_password
  port              = var.db_port

  db_subnet_group_name   = aws_db_subnet_group.athena_db.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true
  multi_az            = false

  tags = {
    Name = var.db_instance_identifier
  }
}
