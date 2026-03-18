variable "alb_name" {}
variable "target_group_name" {}
variable "app_port" {}

variable "aws_region" {}

variable "ecr_repository_name" {}

variable "ecs_cluster_name" {}
variable "ecs_task_family" {}
variable "ecs_task_cpu" {}
variable "ecs_task_memory" {}
variable "container_name" {}
variable "image_tag" {}
variable "ecs_name_service" {}

variable "app_bucket_name" {}
variable "s3_bucket_name" {}
variable "s3_tag_name" {}

variable "db_secret_name" {}

variable "db_subnet_group_name" {}
variable "db_instance_identifier" {}
variable "db_allocated_storage" {}
variable "db_engine" {}
variable "db_engine_version" {}
variable "db_instance_class" {}
variable "db_name" {}
variable "db_username" {}
variable "db_password" {}
variable "db_port" {}

variable "ecs_sg_name" {}
variable "rds_sg_name" {}
variable "alb_sg_name" {}
variable "security-group-name" {}

variable "vpc_name" {}
variable "igw_name" {}
variable "rt_name" {}
variable "rt_name2" {}

variable "nat_eip" {}
variable "nat_gateway_name" {}

variable "public_subnet_1_cidr_block" {}
variable "public_subnet_1_name" {}
variable "public_subnet_2_cidr_block" {}
variable "public_subnet_2_name" {}

variable "private_subnet_1_name" {}
variable "private_subnet_2_name" {}

variable "availability_zone" {}
variable "availability_zone_2" {}

variable "vpc_private1_subnet1_cidr_block" {}
variable "vpc_private2_subnet1_cidr_block" {}
variable "route_table2_ipv4_cidr_block" {}