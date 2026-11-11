# Duely v2.0 - Modern Development & Production Container
# Multi-stage build for optimized production image

# Stage 1: Build environment
FROM node:26-slim AS builder

LABEL maintainer="Duely Developer Team"
LABEL description="Modern build environment for Duely v2.0"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies and explicitly provision Electron's lazy binary download.
RUN npm ci && node -e "require('electron')"

# Copy source code
COPY . .

# Build the application. `build:prod` runs scripts/build.mjs, which bundles
# electron/main.ts and server/app.ts with the esbuild Node API and delegates the
# two Angular static bundles to `ng build --configuration production`.
RUN npm run build:prod

# Stage 2: Production runtime (server only)
FROM node:26-slim AS production-server

LABEL maintainer="Duely Developer Team"
LABEL description="Production runtime for Duely Server v2.0"

WORKDIR /app

# Copy the measured builder manifests before installing production dependencies.
# This stage dependency keeps BuildKit's builder/runtime installs sequential.
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist/server ./dist/server

EXPOSE 8000

USER node

CMD ["node", "./dist/server/app.js"]

# Stage 3: Development environment
FROM node:26-slim AS development

LABEL maintainer="Duely Developer Team"
LABEL description="Development environment for Duely v2.0"

WORKDIR /app

# Install system dependencies for development
# xz-utils and binutils supply the compressor (`tar -J`) and the `ar` archiver
# that electron-builder's fpm-based deb target invokes; node:26-slim ships
# neither. zlib1g-dev supplies the unversioned `libz.so` the AppImage runtime is
# linked against, which the packaging acceptance needs to run
# `--appimage-extract` against the artifact it just built.
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    ca-certificates \
    libgtk-3-0 \
    xvfb \
    xauth \
    xz-utils \
    binutils \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Provision Playwright Chromium + OS-level libraries (libnss3, libatk, libgbm, …).
# Pinned to the exact @playwright/test version installed by npm ci above — the
# lockfile determines the browser revision. Layer cache busts on lockfile change,
# so a Playwright version bump always re-downloads the matching browser.
# The assertion at the end hard-fails the build on any driver/browser mismatch.
RUN PW_PKG_VERSION=$(node -p "require('./node_modules/@playwright/test/package.json').version") \
    && echo "Provisioning Chromium for @playwright/test ${PW_PKG_VERSION}" \
    && npx playwright install --with-deps chromium \
    && INSTALLED_VERSION=$(npx playwright --version | grep -oP '[\d.]+') \
    && if [ "$INSTALLED_VERSION" != "$PW_PKG_VERSION" ]; then \
         echo "FATAL: Playwright driver ${INSTALLED_VERSION} != package ${PW_PKG_VERSION}"; exit 1; \
       fi \
    && echo "Playwright ${INSTALLED_VERSION} — Chromium provisioned OK"

# Fail provisioning if Electron extraction or required shared libraries are missing.
# Electron 45 lazily downloads on first require; provision before capturing its path.
# Desktop launch, protocol and packaging acceptance remain separate verification.
RUN set -eux; \
    node -e "require('electron')"; \
    ELECTRON_BINARY=$(node -p "require('electron')"); \
    test -x "$ELECTRON_BINARY"; \
    ldd "$ELECTRON_BINARY" > /tmp/electron-libraries.txt 2>&1 \
      || { cat /tmp/electron-libraries.txt; exit 1; }; \
    if grep -q 'not found' /tmp/electron-libraries.txt; then \
      cat /tmp/electron-libraries.txt; exit 1; \
    fi

# Copy source code
COPY . .

# Expose ports for development server
EXPOSE 8000 4200 49152

# Default command for development: the Angular dev server on the published port
# 4200, with hot reload and the SPA history fallback. `npm run build:watch`
# remains available for iterating on the two Node-side bundles.
CMD ["npm", "run", "serve"]
