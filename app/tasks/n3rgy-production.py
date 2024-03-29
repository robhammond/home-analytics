"""
Fetch past 7 days data from n3rgy.

Requires Consumer API endpoint to be enabled at https://data.n3rgy.com/consumer/home
"""
import requests
import sqlite3
import os
import json
import argparse
from datetime import datetime, timedelta
from update_rates import update_export


def parse_args():
    parser = argparse.ArgumentParser(description="Pull solar production data from n3rgy")
    parser.add_argument("--start_date", type=str, help="Start date in the format YYYYMMDD.")
    parser.add_argument("--end_date", type=str, help="End date in the format YYYYMMDD.")
    return parser.parse_args()


HA_DB_URL = os.getenv("HA_DB_URL")


def fetch_production(start_date=None, end_date=None):
    "fetches electricity production from n3rgy endpoint"
    if not start_date:
        today = datetime.now()
        last_week = today - timedelta(days=7)
        start_date = last_week.strftime("%Y%m%d")

    if not end_date:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        end_date = tomorrow.strftime("%Y%m%d")

    endpoint_url = "https://consumer-api.data.n3rgy.com/electricity/production/1"
    params = {
        "start": start_date,
        "end": end_date,
        "output": "json",
    }
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()
    sql = """
        SELECT 
            value 
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE key='auth_header' 
            AND e.entity_name = 'n3rgy'
    """
    try:
        res = c.execute(sql).fetchone()
        auth_header = res[0]
    except Exception as e:
        raise Exception("Authorization header not found in DB")

    if auth_header == "12345":
        raise Exception("Please define the n3rgy Authorization header - see README.md for more information")

    with requests.get(endpoint_url, params=params, headers={"Authorization": auth_header}) as res:
        res_json = res.json()
        print(json.dumps(res_json))

        for value in res_json["values"]:
            ts = value["timestamp"]

            # times are in UTC, it doesn't include TZ
            dt = datetime.strptime(ts, "%Y-%m-%d %H:%M")
            dt_start = datetime.strptime(ts, "%Y-%m-%d %H:%M") - timedelta(minutes=30)

            # print(dt)

            sql = f"""
                UPDATE electricity 
                    SET kwh_exported = {value["value"]}
                WHERE
                    datetime = '{dt}'
                    AND datetime_start = '{dt_start}'
                    AND granularity = '{res_json["granularity"]}'
                    and source = 'n3rgy'
            """
            try:
                c.execute(sql)
            except Exception as e:
                print(f"Error inserting: {e}")
                pass
        conn.commit()

    conn.close()
    update_export()


def main():
    args = parse_args()
    fetch_production(args.start_date, args.end_date)


if __name__ == "__main__":
    main()
