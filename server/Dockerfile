# --- STAGE 1: Build & Install Dependencies ---
FROM node:20-alpine AS dependencies
WORKDIR /app

COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --omit=dev --legacy-peer-deps

COPY . .

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init (for process signals) and wget (for Docker health checks)
RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nodejs -u 1001 -G nodejs

# Create required directories and set proper permissions
RUN mkdir -p logs uploads && chown -R nodejs:nodejs /app

# Copy dependencies and application files from Stage 1
COPY --from=dependencies --chown=nodejs:nodejs /app /app

USER nodejs

EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]

# Clean startup process
CMD ["node", "server.js"]