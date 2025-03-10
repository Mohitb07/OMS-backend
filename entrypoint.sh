#!/bin/bash

# Load environment variables from the .env.production file
export $(grep -v '^#' .env.production | xargs)

# Print loaded environment variables (for debugging purposes, optional)
echo "Loaded Environment Variables:"
env

# Build the application
echo "Building the application..."
yarn run build

# Run Prisma migrations to ensure the database is up-to-date
echo "Applying Prisma migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
yarn start