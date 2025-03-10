#!/bin/bash
source ./.env.production

echo "MYSQL_URL=$MYSQL_URL"
export MYSQL_URL=$MYSQL_URL
yarn run build