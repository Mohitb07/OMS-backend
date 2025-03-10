#!/bin/bash
source ./.env.production
export MYSQL_URL=$MYSQL_URL
yarn run build