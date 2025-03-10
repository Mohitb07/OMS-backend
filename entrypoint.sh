#!/bin/bash

# Load environment variables from the .env.production file
# export $(grep -v '^#' .env.production | xargs)

# Ensure the environment variables are loaded
echo "Loaded MYSQL_URL: $MYSQL_URL"


# Build the application
echo "Building the application..."
yarn run build

# # Run Prisma migrations to ensure the database is up-to-date
# echo "Applying Prisma migrations..."
# npx prisma migrate deploy

# # Start the application
# echo "Starting the application..."
# yarn start