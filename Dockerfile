FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* .npmrc ./

# Install dependencies with legacy-peer-deps flag
RUN npm ci --only=production --legacy-peer-deps

# Copy application code
COPY . .

# Expose the application port
EXPOSE 8080

# Set environment variable to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "-r", "dotenv/config", "index.js"] 