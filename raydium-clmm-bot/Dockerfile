# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose port 8002 (matches the PORT in .env)
EXPOSE 8002

# Start the application
CMD ["npm", "run", "start"]
