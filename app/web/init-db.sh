#!/usr/bin/env bash
set -euo pipefail

DB_FILE=$HA_DB_URL;

echo "Running in $NODE_ENV mode"

if [ ! -f ${DB_FILE/#file:/} ]; then
    echo "${DB_FILE/#file:/} does not exist, building DB..."
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    if [ "$NODE_ENV" = "development" ]; then
        npm run dev
    else
        npm run start
    fi
else
    echo "${DB_FILE/#file:/} exists, migrating..."
    npx prisma migrate deploy
    if [ "$NODE_ENV" = "development" ]; then
        npm run dev
    else
        npm run start
    fi
fi
