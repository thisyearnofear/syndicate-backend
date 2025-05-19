FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the application port
EXPOSE 3003

# Set environment variable to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "-r", "dotenv/config", "index.js"] 