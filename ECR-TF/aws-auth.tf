/*resource "kubernetes_config_map_v1" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    mapRoles = yamlencode([
      {
        rolearn  = data.aws_iam_role.jenkins_role.arn
        username = "jenkins"
        groups   = ["system:masters"]
      }
    ])
  }
}

data "aws_iam_role" "jenkins_role" {
  name = "Jenkins-iam-role"
}
*/