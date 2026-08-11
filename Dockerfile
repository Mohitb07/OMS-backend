# base node image
FROM node:20-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV=production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

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

# Build the app (generate Prisma client)
FROM base as build

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

# NOTE: "ADD prisma prisma/" ensures schema.prisma lands in /app/prisma/
# Previously "ADD prisma ." put files directly into /app/ which broke prisma generate
ADD prisma prisma/

RUN npx prisma generate

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

ADD . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]