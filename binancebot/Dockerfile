# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for development mode)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Expose port 8001 (matches the PORT in .env)
EXPOSE 8001

# Start the application in development mode (no build needed)
CMD ["npm", "run", "start:dev"]
