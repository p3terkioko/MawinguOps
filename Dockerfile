# Build stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Optional: Run build steps if you have any (e.g., npm run build)
# RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files from builder stage
COPY --from=builder /usr/src/app .

# Create required directories and set ownership
RUN mkdir -p uploads logs && \
    chown -R nextjs:nodejs /usr/src/app && \
    chmod 755 uploads logs

# Switch to non-root user
USER nextjs

# Set environment for production
ENV NODE_ENV=production

# Cloud Run sets PORT automatically
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]