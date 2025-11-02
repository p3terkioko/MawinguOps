# Use Node.js 18 LTS Alpine (minimal and fast)
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Create required directories
RUN mkdir -p uploads logs && chmod 755 uploads logs

# Set environment for production
ENV NODE_ENV=production

# Cloud Run sets PORT automatically
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]