# Deployment Guide

This guide provides instructions for building the Docker image and high-level notes for deploying the ClassPulse frontend to AWS.

## Building the Docker Image

The `Dockerfile` is optimized for production builds using a multi-stage process. This ensures the final image is small and contains only what's needed to run the application.

**Build Command:**

To build the production Docker image, run the following command from the root of the project:

```bash
docker build -t classpulse-frontend:latest .
```

- `-t classpulse-frontend:latest`: Tags the image with the name `classpulse-frontend` and version `latest`. You should use semantic versioning for your actual builds (e.g., `classpulse-frontend:1.0.0`).

After the build is complete, you can run it locally to test the production container:

```bash
docker run -p 9002:9002 --env-file .env.local classpulse-frontend:latest
```

This will start the production server on port 9002.

## AWS Deployment (High-Level Notes)

This project does not include infrastructure-as-code scripts. The following are general guidelines for deploying the containerized application to AWS.

### Recommended Service: AWS Fargate

AWS Fargate is a serverless compute engine for containers. It's recommended for this application because it removes the need to manage the underlying EC2 instances.

**Deployment Steps:**

1.  **Push Image to ECR (Elastic Container Registry):**
    - Create a new private repository in ECR (e.g., `classpulse-frontend`).
    - Authenticate your Docker CLI with ECR.
    - Tag your local image with the ECR repository URI:
      ```bash
      docker tag classpulse-frontend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/classpulse-frontend:latest
      ```
    - Push the image to ECR:
      ```bash
      docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/classpulse-frontend:latest
      ```

2.  **Create an ECS Task Definition:**
    - In ECS, create a new Task Definition for Fargate.
    - **Container Definition:**
      - Point to the ECR image URI you just pushed.
      - **Port Mappings:** Map container port `9002` to the host.
      - **Environment Variables:** This is the most critical step for configuration. You should not hardcode secrets. Use AWS Secrets Manager or Parameter Store integration with ECS to inject environment variables securely.
        - `N8N_WEBHOOK_URL`
        - `NEXT_PUBLIC_APP_URL`
        - `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
        - `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
        - etc.

3.  **Create an ECS Service:**
    - Create a new ECS Service within an ECS Cluster.
    - Use the Task Definition you created.
    - **Networking:**
      - Deploy the service into a VPC with public and private subnets.
      - Place the Fargate tasks in private subnets.
      - **Security Groups:** Configure a security group that allows inbound traffic on port `9002` from the Application Load Balancer.
    - **Load Balancing:**
      - Create an Application Load Balancer (ALB).
      - Create a target group that points to the Fargate tasks on port `9002`.
      - Create a listener on the ALB for HTTPS (port 443) that forwards traffic to your target group. Use AWS Certificate Manager (ACM) to provision an SSL certificate.

4.  **Configure DNS:**
    - In Route 53, create an `A` record (e.g., `app.classpulse.com`) that points to your Application Load Balancer.

### Alternative Service: AWS EC2

If you prefer to manage the virtual machines yourself, you can deploy the Docker container to an EC2 instance.

1.  **Provision an EC2 Instance:**
    - Launch an EC2 instance (e.g., `t3.micro` or larger) with Amazon Linux 2 or Ubuntu.
    - Install Docker and Docker Compose on the instance.
2.  **Deploy the Application:**
    - SSH into the instance.
    - Pull your code from a Git repository.
    - Create a `.env` file with the production environment variables.
    - Pull the image from ECR or build it directly on the instance.
    - Run the container using `docker run` or a `docker-compose.yml` file configured for production.
3.  **Configure Networking:**
    - You would still typically place an Application Load Balancer in front of the EC2 instance for SSL termination and scalability.
