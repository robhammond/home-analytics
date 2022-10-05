"""
Fetch past 7 days data from n3rgy.

Requires Consumer API endpoint to be enabled at https://data.n3rgy.com/consumer/home
"""
import requests
import sqlite3
import os
from datetime import datetime, timedelta
from update_rates import refresh_db

HA_DB_URL = os.getenv('HA_DB_URL')


def fetch_usage(start_date=None, end_date=None):
    "fetches electricity usage from n3rgy endpoint"
    if not start_date:
        today = datetime.now()
        last_week = today - timedelta(days=7)
        start_date = last_week.strftime("%Y%m%d")

    if not end_date:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        end_date = tomorrow.strftime("%Y%m%d")

    endpoint_url = "https://consumer-api.data.n3rgy.com/electricity/consumption/1"
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

    if auth_header == '12345':
        raise Exception("Please define the n3rgy Authorization header - see README.md for more information")

    with requests.get(endpoint_url, params=params, headers={"Authorization": auth_header}) as res:
        res_json = res.json()

        for value in res_json["values"]:
            ts = value["timestamp"]

            # times are in UTC, it doesn't include TZ
            dt = datetime.strptime(ts, "%Y-%m-%d %H:%M")
            dt_start = datetime.strptime(ts, "%Y-%m-%d %H:%M") - timedelta(minutes=30)

            # print(dt)

            sql = f"""
                INSERT INTO electricity (
                    datetime,
                    datetime_start,
                    kwh,
                    granularity,
                    source
                ) 
                VALUES (
                    '{dt}',
                    '{dt_start}',
                    {value["value"]},
                    '{res_json["granularity"]}',
                    'n3rgy'
                );
            """
            try:
                c.execute(sql)
                conn.commit()
            except Exception as e:
                print(f"Error inserting: {e}")
                pass

    conn.close()
    refresh_db()


if __name__ == "__main__":
    fetch_usage()
