# Enterprise Production Dockerfile
FROM node:20-alpine AS base

# Install dependencies for sharp (if needed) and security scanning
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
FROM base AS deps
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build frontend
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production stage - minimal image
FROM node:20-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./
COPY --from=builder --chown=nodejs:nodejs /app/lib ./lib
COPY --from=builder --chown=nodejs:nodejs /app/netlify ./netlify
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "server.js"]

# Development stage
FROM base AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Run with hot reload
CMD ["npm", "run", "dev"]
