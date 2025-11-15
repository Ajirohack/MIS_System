# Multi-stage build for tenant service
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/tenant-service/package*.json ./services/tenant-service/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install development dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3006

# Start development server
CMD ["npm", "run", "dev", "--workspace=services/tenant-service"]

# Production build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN npm run build --workspace=services/tenant-service

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/tenant-service/package*.json ./services/tenant-service/
COPY shared/package*.json ./shared/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/services/tenant-service/dist ./services/tenant-service/dist
COPY --from=build --chown=nodejs:nodejs /app/shared/dist ./shared/dist

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start production server
CMD ["node", "services/tenant-service/dist/index.js"] 