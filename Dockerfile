# Duely v2.0 - Modern Development & Production Container
# Multi-stage build for optimized production image

# Stage 1: Build environment
FROM node:24-bookworm AS builder

LABEL maintainer="Duely Developer Team"
LABEL description="Modern build environment for Duely v2.0"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Stage 2: Production runtime (server only)
FROM node:24-bookworm-slim AS production-server

LABEL maintainer="Duely Developer Team"
LABEL description="Production runtime for Duely Server v2.0"

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist/server ./dist/server

EXPOSE 8000

USER node

CMD ["node", "./dist/server/app.js"]

# Stage 3: Development environment
FROM node:24-bookworm AS development

LABEL maintainer="Duely Developer Team"
LABEL description="Development environment for Duely v2.0"

WORKDIR /app

# Install system dependencies for development
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Angular CLI globally for development
RUN npm install -g @angular/cli

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose ports for development server
EXPOSE 8000 4200 49152

# Default command for development
CMD ["npm", "run", "build:watch"]
