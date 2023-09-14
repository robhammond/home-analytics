# Fetch data from Solis Cloud API
import base64
import argparse
import hashlib
import hmac
import json
import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from time import sleep
import requests

logging.basicConfig(level=logging.DEBUG)

HA_DB_URL = os.getenv("HA_DB_URL")

API_BASE = "https://api.solcast.com.au/rooftop_sites"


def _get_creds():
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()
    sql = """
        SELECT
            key, 
            value
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE 
            LOWER(e.entity_name) LIKE 'solcast%'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "resource_id":
                creds["resource_id"] = r[1]
            if r[0] == "api_key":
                creds["api_key"] = r[1]

    except Exception as e:
        raise Exception("Authorization details not found in DB")

    return creds


def get_forecast():
    creds = _get_creds()
    endpoint_url = f"{API_BASE}/{creds['resource_id']}/forecasts?format=json&api_key={creds['api_key']}"
    print(endpoint_url)
    with requests.get(endpoint_url) as res:
        if res.status_code == 200:
            forecast_data = res.json()["forecasts"]
            save_forecasts(forecast_data)

def save_forecasts(forecasts):
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()

    for forecast in forecasts:
        update_timestamp = int(datetime.utcnow().strftime('%Y%m%d%H%M'))
        query = """
            INSERT INTO solcast_forecasts
            (pv_estimate, pv_estimate10, pv_estimate90, period_end, period, update_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        c.execute(query, (
            forecast['pv_estimate'], 
            forecast['pv_estimate10'], 
            forecast['pv_estimate90'], 
            forecast['period_end'], 
            forecast['period'], 
            update_timestamp)
        )
        
    conn.commit()
    conn.close()

def main():
    get_forecast()

if __name__ == "__main__":
    main()