resource "aws_s3_bucket" "alb-log" {
  bucket = var.s3_bucket_name

  tags = {
    Name        = var.s3_tag_name
  }
}

resource "aws_s3_bucket" "storag-s3" {
  bucket = var.app_bucket_name

  tags = {
    Name        = var.app_bucket_name
  }
}