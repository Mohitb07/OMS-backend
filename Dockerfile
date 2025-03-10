# Base node image
FROM node:16-bullseye-slim as base

# Set environment variable for base and all layers that inherit from it
ENV NODE_ENV=production

# Install openssl for Prisma and ca-certificates
RUN apt-get update && apt-get install -y openssl && apt-get install -y ca-certificates

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /app

ADD package.json yarn.lock ./
RUN yarn install --production=false

# Setup production node_modules
FROM base as production-deps

WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD package.json yarn.lock ./
RUN yarn install --production=true

# Build the app
FROM base as build

WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD prisma ./
RUN npx prisma generate
ADD . .
RUN chmod +x ./entrypoint.sh

# Final production image
FROM base

WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
ADD . .
COPY --from=build /app/entrypoint.sh ./entrypoint.sh

# Use the updated entrypoint script
ENTRYPOINT ["./entrypoint.sh"]