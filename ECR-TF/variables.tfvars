alb_name          = "Athena-alb"
target_group_name = "Athena-target-group"
app_port          = 9002

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
db_engine              = "postgres"
db_engine_version      = "16.3"
db_instance_class      = "db.t3.micro"
db_name                = "athenadb"
db_username            = "athena_admin"
db_password            = "ChangeMe123!"
db_port                = 5432

app_ecs_sg_name         = "Athena-ecs-sg"
rds_sg_name         = "Athena-rds-sg"
alb_sg_name         = "Athena-alb-sg"
security-group-name = "Athena-sg"

vpc_name = "Athena-vpc"
igw_name = "Athena-igw"
rt_name  = "Athena-route-table"
rt_name2 = "Athena-route-table2"

nat_eip          = "Athena-nat-eip"
nat_gateway_name = "Athena-nat-gateway"

public_subnet_1_cidr_block = "10.0.6.0/24"
public_subnet_1_name       = "Athena-subnet"
public_subnet_2_cidr_block = "10.0.3.0/24"
public_subnet_2_name       = "Athena-public-subnet-2"

private_subnet_1_name = "Athena-private-subnet-1"
private_subnet_2_name = "Athena-private-subnet-2"

availability_zone   = "us-east-1a"
availability_zone_2 = "us-east-1b"

vpc_private1_subnet1_cidr_block = "10.0.4.0/24"
vpc_private2_subnet1_cidr_block = "10.0.2.0/24"

route_table2_ipv4_cidr_block = "0.0.0.0/0"

efs_name           = "athena-n8n-efs"
efs_creation_token = "athena-n8n-efs-token"
efs_sg_name        = "athena-efs-sg"

n8n_task_family    = "athena-n8n-task"
n8n_container_name = "n8n"
n8n_image          = "docker.n8n.io/n8nio/n8n:latest"
n8n_port           = 5678
n8n_cpu            = "512"
n8n_memory         = "1024"
n8n_service_name   = "athena-n8n-service"
n8n_ecs_sg_name = "Athena-n8n-ecs-sg"

root_domain_name = "test-master.click"
subdomain_name   = "athena.test-master.click"

cognito_user_pool_client_name = "athena-user-pool-client"
cognito_user_pool_name        = "athena-user-pool"
cognito_domain_prefix         = "athena-auth-test-master"
