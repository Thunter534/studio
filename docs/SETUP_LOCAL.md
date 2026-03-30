# Local Development Setup

This guide explains how to get the ClassPulse frontend running on your local machine for development.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 20.x or later)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Docker](https://www.docker.com/products/docker-desktop/) (optional, for running the containerized version)

## 1. Clone the Repository

First, clone the project repository to your local machine.

```bash
git clone <repository-url>
cd classpulse
```

## 2. Install Dependencies

Install the necessary npm packages.

```bash
npm install
```

## 3. Configure Environment Variables

The application requires environment variables to connect to the backend and other services.

1.  Copy the example environment file:
    ```bash
    cp .env.example .env.local
    ```
2.  Open `.env.local` and configure the variables.

    - `N8N_WEBHOOK_URL`: This is the most important variable for local development. It should point to the webhook URL of your local or cloud-hosted n8n instance.
      - If you are running n8n locally, the URL will typically be `http://localhost:5678/webhook/classpulse`.

    - `NEXT_PUBLIC_...`: The Microsoft Entra ID variables are not strictly required for the default mock authentication to work, but you will need them to implement real authentication.

## 4. Running the Frontend

You can run the frontend application in two ways:

### A) Using npm (Standard Method)

This method uses the Next.js development server and provides features like hot-reloading.

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).

### B) Using Docker Compose

This method runs the application inside a Docker container, which is closer to the production environment. It's useful for testing the containerized setup.

1.  Make sure Docker Desktop is running.
2.  Run the following command:

    ```bash
    docker-compose up --build
    ```

The application will also be available at [http://localhost:9002](http://localhost:9002). The `docker-compose.yml` file is configured to use the development server and hot-reloading.

## 5. Running the Backend (n8n)

The frontend is useless without a backend to talk to. You must have an n8n instance running and configured to receive webhooks.

- Refer to the [official n8n documentation](https://docs.n8n.io/) for instructions on how to set up and run n8n.
- You will need to create workflows that are triggered by the webhook URL you specified in `N8N_WEBHOOK_URL`.
- See `docs/N8N_WORKFLOWS.md` for details on what each workflow should do.
