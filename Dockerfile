# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev deps for build tools)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Bundle the sync worker to standalone JS (no tsx needed at runtime)
RUN npx esbuild worker/sync.ts --bundle --platform=node --format=esm --outfile=dist/sync-worker.mjs --external:postgres --external:node-cron

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running database migrations..."' >> /app/start.sh && \
    echo 'node /app/scripts/run-migrations.cjs' >> /app/start.sh && \
    echo 'echo "Starting sync worker in background..."' >> /app/start.sh && \
    echo 'node /app/dist/sync-worker.mjs --scheduled &' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'exec node /app/dist/server/entry.mjs' >> /app/start.sh && \
    chmod +x /app/start.sh

# Create persistent data directory for uploads
RUN mkdir -p /app/data/uploads

# Declare volume so uploads survive container rebuilds
VOLUME /app/data

# Expose port
EXPOSE 4321

# Start with migrations and sync worker
CMD ["/app/start.sh"]
