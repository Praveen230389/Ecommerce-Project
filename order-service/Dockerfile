# --- Stage 1: Build & Dependency Isolation ---
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependency manifests first to leverage Docker cache layers
COPY package*.json ./

# Install production dependencies and keep npm cache clean
RUN npm ci --only=production

# Copy the rest of the microservice application source code
COPY . .

# --- Stage 2: Final Secure Runtime Image ---
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment variable
ENV NODE_ENV=production

# Create a non-privileged system user for security compliance (Principle of Least Privilege)
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

# Copy only the necessary node_modules and code from the builder stage
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/ .

# Switch to the non-root secure user
USER nodeapp

# Standard internal microservice port (Change only if a specific service requires a different port)
EXPOSE 8080

# Production startup command
CMD ["npm", "start"]
