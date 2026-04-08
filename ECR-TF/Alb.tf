resource "aws_acm_certificate" "athena_cert" {
  domain_name               = var.subdomain_name
  subject_alternative_names = [var.n8n_subdomain_name]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "athena_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.athena_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "athena_cert" {
  certificate_arn         = aws_acm_certificate.athena_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.athena_cert_validation : record.fqdn]
}

resource "aws_lb" "alb" {
  name               = var.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [data.aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.alb-log.id
    prefix  = "test-lb"
    enabled = true
  }

  tags = {
    Name = var.alb_name
  }
}

resource "aws_lb_target_group" "ecs_tg" {
  name_prefix = "athtg-"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.vpc.id
  target_type = "ip"

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "alb_listener" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "alb_https_listener" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.athena_cert.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ecs_tg.arn
  }
}

resource "aws_lb_target_group" "n8n_tg" {
  name_prefix = "n8ntg-"
  port        = var.n8n_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.vpc.id
  target_type = "ip"

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200,204,301,302"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener_rule" "n8n_http_rule" {
  listener_arn = aws_lb_listener.alb_https_listener.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n_tg.arn
  }

  condition {
    path_pattern {
      values = ["/n8n*", "/rest*"]
    }
  }
}

resource "aws_lb_listener_rule" "n8n_host_rule" {
  listener_arn = aws_lb_listener.alb_listener.arn
  priority     = 90

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n_tg.arn
  }

  condition {
    host_header {
      values = [var.n8n_subdomain_name]
    }
  }
}
