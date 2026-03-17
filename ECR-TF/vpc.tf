data "aws_vpc" "vpc" {
  filter {
    name   = "tag:Name"
    values = [var.vpc-name]
  }
}



data "aws_internet_gateway" "igw" {
  filter {
    name   = "tag:Name"
    values = [var.igw-name]
  }
}

data "aws_subnet" "public-subnet" {
  filter {
    name   = "tag:Name"
    values = [var.subnet-name]
  }
}

data "aws_route_table" "public_rt" {
  vpc_id = data.aws_vpc.vpc.id
  filter {
    name   = "tag:Name"
    values = [var.rt-name]
  }
}

#---eip for nat gateway-----
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  tags = {
    Name = var.nat-eip
  }
}



resource "aws_nat_gateway" "NAT" {
  connectivity_type = "public"
  subnet_id         = data.aws_subnet.public-subnet.id
  allocation_id     = aws_eip.nat_eip.id

  tags = {
    Name = var.nat-gateway-name
  }
  depends_on = [data.aws_internet_gateway.igw]
}
# --------- private subnets, route table and associations ---------
resource "aws_subnet" "private1-subnet1" {
  vpc_id                  = data.aws_vpc.vpc.id
  cidr_block              = var.vpc_private1_subnet1_cidr_block
  availability_zone       = var.availability_zone
  tags = {
    Name = var.subnet-name
  }
}

resource "aws_subnet" "private2-subnet1" {
  vpc_id                  = data.aws_vpc.vpc.id
  cidr_block              = var.vpc_private2_subnet1_cidr_block
  availability_zone       = var.availability_zone
  tags = {
    Name = var.subnet-name2
  }
}

resource "aws_route_table" "rt2" {
  vpc_id = data.aws_vpc.vpc.id
  route {
    cidr_block = var.route_table2_ipv4_cidr_block
    nat_gateway_id = aws_nat_gateway.NAT.id
  }

  tags = {
    Name = var.rt-name2
  }
}

resource "aws_route_table_association" "rt-association2" {
  route_table_id = aws_route_table.rt2.id
  subnet_id      = aws_subnet.private1-subnet1.id
}

resource "aws_route_table_association" "private_subnet2_assoc" {
  subnet_id      = aws_subnet.private2-subnet1.id
  route_table_id = aws_route_table.rt2.id
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

resource "aws_route_table_association" "public_subnet_2_assoc" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = data.aws_route_table.public_rt.id
}