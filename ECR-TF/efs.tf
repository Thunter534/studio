

resource "aws_efs_file_system" "n8n_efs" {
  creation_token = var.efs_creation_token
  encrypted      = true

  tags = {
    Name = var.efs_name
  }
}

resource "aws_efs_access_point" "n8n_access_point" {
  file_system_id = aws_efs_file_system.n8n_efs.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/n8n"

    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
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
