import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta
import pytz
import sqlite3
import os

from update_rates import update_import

HA_DB_URL = os.getenv("HA_DB_URL")
API_ROOT = "https://api.octopus.energy"


def get_user_details():
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()
    sql = """
        SELECT
            LOWER(key), 
            value
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE 
            LOWER(e.entity_name) = 'octopus energy'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "mpan":
                if r[1] == "12345":
                    raise Exception("Invalid credentials found - check your MPAN details")
                creds["mpan"] = r[1]
            if r[0] == "serial_number":
                if r[1] == "12345":
                    raise Exception("Invalid credentials found - check your Serial Number details")
                creds["serial_number"] = r[1]
            if r[0] == "api_key":
                if r[1] == "12345":
                    raise Exception("Invalid credentials found - check your API key details")
                creds["api_key"] = r[1]
    except Exception as e:
        raise Exception("Authorization details not found in DB")

    return creds


def fetch_usage(start_date=None, end_date=None):
    if not start_date:
        today = datetime.now()
        last_week = today - timedelta(days=2)
        start_date = last_week.strftime("%Y-%m-%dT00:00:00Z")

    if not end_date:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        end_date = tomorrow.strftime("%Y-%m-%dT00:00:00Z")
    creds = get_user_details()

    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()

    request_url = f"{API_ROOT}/v1/electricity-meter-points/{creds['mpan']}/meters/{creds['serial_number']}/consumption/"
    with requests.get(
        request_url,
        params={"period_from": start_date, "period_to": end_date},
        auth=HTTPBasicAuth(creds["api_key"], ""),
    ) as res:
        if res.status_code == 200:
            res_json = res.json()
            print(res_json)
            for result in res_json["results"]:
                print(result)

                tmp_start = datetime.strptime(result["interval_start"], "%Y-%m-%dT%H:%M:%S%z")
                tmp_end = datetime.strptime(result["interval_end"], "%Y-%m-%dT%H:%M:%S%z")

                tmp_start = tmp_start.astimezone(pytz.utc)
                tmp_end = tmp_end.astimezone(pytz.utc)
                dt_start = datetime.strftime(tmp_start, "%Y-%m-%d %H:%M:%S")
                dt_end = datetime.strftime(tmp_end, "%Y-%m-%d %H:%M:%S")

                sql = f"""
                    INSERT INTO electricity (
                        datetime,
                        datetime_start,
                        kwh,
                        granularity,
                        source
                    ) 
                    VALUES (
                        '{dt_end}',
                        '{dt_start}',
                        {result["consumption"]},
                        'halfhour',
                        'octopus'
                    );
                """
                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass

            conn.close()
            update_import()
        else:
            print(f"Error fetching: {res.status_code} HTTP response")
            print(request_url)


if __name__ == "__main__":
    fetch_usage()
