# Base node image
FROM node:16-bullseye-slim as base

# Set environment variable for base and all layers that inherit from it
ENV NODE_ENV=production

# Install openssl for Prisma and ca-certificates
RUN apt-get update && apt-get install -y openssl && apt-get install -y ca-certificates

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /app

# Add package.json and yarn.lock
ADD package.json yarn.lock ./

# Install all dependencies
RUN yarn install --production=false

# Setup production node_modules
FROM base as production-deps

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

# Add package.json and yarn.lock
ADD package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production=true

# Build the app
FROM base as build

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

# Add prisma schema and generate client
ADD prisma ./
RUN npx prisma generate

# Add the rest of the application files
ADD . .

# Ensure entrypoint.sh is executable
RUN chmod +x ./entrypoint.sh

# Run entrypoint script (if necessary, include database migrations)
RUN ./entrypoint.sh

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# Add the rest of the application files
ADD . .

# Ensure the migrations are applied before starting the application
RUN npx prisma migrate deploy

# Start the application
CMD ["yarn", "start"]