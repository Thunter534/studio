alb_name          = "Athena-alb"
target_group_name = "Athena-target-group"
app_port          = 3000

aws_region = "us-east-1"

ecr_repository_name = "athena-repo"

ecs_cluster_name = "Athena-ecs-cluster"
ecs_task_family  = "Athena-task"
ecs_task_cpu     = "256"
ecs_task_memory  = "512"
container_name   = "athena-container"
image_tag        = "latest"
ecs_name_service = "Athena-ecs-service"

app_bucket_name = "athena-app-storage-loic-001"
s3_bucket_name  = "alb-logs-athena-loic-001"
s3_tag_name     = "Athena-ALB-Logs"

db_secret_name = "athena-db-secret"

db_subnet_group_name   = "athena-db-subnet-group"
db_instance_identifier = "athena-db"
db_allocated_storage   = 20
db_engine              = "mysql"
db_engine_version      = "8.0"
db_instance_class      = "db.t3.micro"
db_name                = "athenadb"
db_username            = "admin"
db_password            = "ChangeMe123!"
db_port                = 3306

ecs_sg_name         = "Athena-ecs-sg"
rds_sg_name         = "Athena-rds-sg"
alb_sg_name         = "Athena-alb-sg"
security-group-name = "Jenkins-sg"

vpc_name = "Athena-vpc"
igw_name = "Athena-igw"
rt_name  = "Athena-route-table"
rt_name2 = "Athena-route-table2"

nat_eip          = "Athena-nat-eip"
nat_gateway_name = "Athena-nat-gateway"

public_subnet_1_cidr_block = "10.0.1.0/24"
public_subnet_1_name       = "Athena-public-subnet-1"
public_subnet_2_cidr_block = "10.0.3.0/24"
public_subnet_2_name       = "Athena-public-subnet-2"

private_subnet_1_name = "Athena-private-subnet-1"
private_subnet_2_name = "Athena-private-subnet-2"

availability_zone   = "us-east-1a"
availability_zone_2 = "us-east-1b"

vpc_private1_subnet1_cidr_block = "10.0.4.0/24"
vpc_private2_subnet1_cidr_block = "10.0.2.0/24"

route_table2_ipv4_cidr_block = "0.0.0.0/0"