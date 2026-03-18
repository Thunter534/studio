data "aws_vpc" "vpc" {
  filter {
    name   = "tag:Name"
    values = [var.vpc_name]
  }
}

data "aws_internet_gateway" "igw" {
  filter {
    name   = "tag:Name"
    values = [var.igw_name]
  }
}

data "aws_route_table" "public_rt" {
  vpc_id = data.aws_vpc.vpc.id

  filter {
    name   = "tag:Name"
    values = [var.rt_name]
  }
}

resource "aws_eip" "nat_eip" {
  domain = "vpc"

  tags = {
    Name = var.nat_eip
  }
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = data.aws_vpc.vpc.id
  cidr_block              = var.public_subnet_1_cidr_block
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = var.public_subnet_1_name
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = data.aws_vpc.vpc.id
  cidr_block              = var.public_subnet_2_cidr_block
  availability_zone       = var.availability_zone_2
  map_public_ip_on_launch = true

  tags = {
    Name = var.public_subnet_2_name
  }
}

resource "aws_route_table_association" "public_subnet_1_assoc" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = data.aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_subnet_2_assoc" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = data.aws_route_table.public_rt.id
}

resource "aws_nat_gateway" "nat" {
  connectivity_type = "public"
  subnet_id         = aws_subnet.public_subnet_1.id
  allocation_id     = aws_eip.nat_eip.id

  tags = {
    Name = var.nat_gateway_name
  }

  depends_on = [data.aws_internet_gateway.igw]
}

resource "aws_subnet" "private1_subnet1" {
  vpc_id            = data.aws_vpc.vpc.id
  cidr_block        = var.vpc_private1_subnet1_cidr_block
  availability_zone = var.availability_zone

  tags = {
    Name = var.private_subnet_1_name
  }
}

resource "aws_subnet" "private2_subnet1" {
  vpc_id            = data.aws_vpc.vpc.id
  cidr_block        = var.vpc_private2_subnet1_cidr_block
  availability_zone = var.availability_zone_2

  tags = {
    Name = var.private_subnet_2_name
  }
}

resource "aws_route_table" "rt2" {
  vpc_id = data.aws_vpc.vpc.id

  route {
    cidr_block     = var.route_table2_ipv4_cidr_block
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = var.rt_name2
  }
}

resource "aws_route_table_association" "rt_association2" {
  route_table_id = aws_route_table.rt2.id
  subnet_id      = aws_subnet.private1_subnet1.id
}

resource "aws_route_table_association" "private_subnet2_assoc" {
  subnet_id      = aws_subnet.private2_subnet1.id
  route_table_id = aws_route_table.rt2.id
}