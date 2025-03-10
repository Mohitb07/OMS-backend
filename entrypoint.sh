#!/bin/bash

# Load environment variables from the .env.production file
# export $(grep -v '^#' .env.production | xargs)

npx prisma migrate status
# Build the application
echo "Building the application..."
yarn run build