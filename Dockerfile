# Dockerfile for Next.js application

# 1. Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# 2. Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy local env file if it exists (optional - can also use build args)
# Note: For production builds, you should use environment variables or build args
# instead of copying .env.local into the image
RUN if [ -f .env.local ]; then cp .env.local .env.local; fi

RUN npm run build

# 3. Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# You can disable the hostname binding if you want to run the container on a different host
# ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory (create empty one if it doesn't exist in builder)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 9002

# Set the correct port for the start command
CMD ["npm", "start", "--", "-p", "9002"]
