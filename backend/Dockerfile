# Stage 1: Builder
# We use a standard Node image to build the TypeScript code
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for tsc)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to dist/
RUN npm run build


# Stage 2: Production
# We use the official Puppeteer image which includes a working Chrome instance
# This saves us from managing complex apt-get installs for libraries
FROM ghcr.io/puppeteer/puppeteer:21.11.0

# Switch to root to install deps (if any extra needed) or setup dirs, 
# though usually puppeteer user is default in this image. 
# We'll see if we need to adjust permissions.
USER root

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
# We use npm ci --omit=dev  BUT we might need to be careful if dependenciesMeta is intricate.
# Also, we need to ensure permissions are correct for the 'pptruser' 
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
# Copy specific files needed at runtime that are not in dist (like .env example or config files if not compiled)
COPY --from=builder /app/src/scanners/config ./src/scanners/config
# (Note: if config is .js inside src, tsc likely moved it to dist. 
# If they are .json or static files, we need to copy them. 
# Looking at file list, config/technologies.js is .js, so it should be in dist/src/scanners/config)

# We need to ensure the 'pptruser' owns the directory
RUN chown -R pptruser:pptruser /app

# Switch back to non-root user for security
USER pptruser

# Expose API port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start command
CMD ["npm", "start"]
