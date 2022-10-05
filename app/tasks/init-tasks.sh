#!/usr/bin/env bash
set -euo pipefail

sleep 5;

function run_cron() 
{
    crontab /etc/cron.d/ha_cron
    cron
}

if [[ "$APP_ENV" == "development" ]]; then
    echo "Running in development mode"
    run_cron
elif [[ "$APP_ENV" == "production" ]]; then
    echo "Running in production mode"
    run_cron
else
    echo "Error loading run mode - App env set as: [[ $APP_ENV ]]"
fi

sleep infinity;
