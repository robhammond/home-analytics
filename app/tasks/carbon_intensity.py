"""
This script will take a postcode
and provide half-hourly carbon intensity data from National Grid
to match with your energy usage
https://carbon-intensity.github.io/api-definitions/
"""
from datetime import datetime, timedelta
import json
import os
import re
import requests
import sqlite3

ENDPOINT_URL = "https://api.carbonintensity.org.uk/"
HA_DB_URL = os.getenv("HA_DB_URL")


def fetch_intensity(date_from=None):
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()

    sql = """
        SELECT
            value 
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE 
            LOWER(e.entity_name) = 'carbon intensity'
            AND key = 'postcode'
    """

    postcode = ""
    try:
        res = c.execute(sql).fetchone()
        postcode = res[0]
    except Exception as e:
        raise Exception("Postcode data not found in DB")

    if not re.match(r"^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]$", postcode):
        raise Exception("Valid postcode data not found in DB. Please only use the first part of your postcode (ie WC1)")

    if not date_from:
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        date_from = yesterday.strftime("%Y-%m-%dT00:00Z")

    request_url = f"{ENDPOINT_URL}regional/intensity/{date_from}/fw24h/postcode/{postcode}"

    headers = {"Accept": "application/json"}

    with requests.get(request_url, headers=headers) as res:
        res_json = res.json()

        for value in res_json["data"].get("data"):
            dt_start = value["from"]
            dt_end = value["to"]

            # times are in UTC, it doesn't include TZ
            dt_start = datetime.strptime(dt_start, "%Y-%m-%dT%H:%MZ")
            dt_end = datetime.strptime(dt_end, "%Y-%m-%dT%H:%MZ")
            gen_mix = {}
            for fuel_type in value["generationmix"]:
                gen_mix[fuel_type["fuel"]] = fuel_type["perc"]

            sql = f"""
                INSERT INTO CarbonIntensity (
                    datetime_start,
                    datetime_end,
                    postcode,
                    intensityForecast,
                    intensityIndex,
                    biomass,
                    coal,
                    gas,
                    hydro,
                    imports,
                    nuclear,
                    other,
                    solar,
                    wind
                ) 
                VALUES (
                    '{dt_start.strftime('%Y-%m-%dT%H:%M:%SZ')}',
                    '{dt_end.strftime('%Y-%m-%dT%H:%M:%SZ')}',
                    '{res_json["data"]["postcode"]}',
                    {value["intensity"]["forecast"]},
                    '{value["intensity"]["index"]}',
                    {gen_mix.get("biomass")},
                    {gen_mix.get("coal")},
                    {gen_mix.get("gas")},
                    {gen_mix.get("hydro")},
                    {gen_mix.get("imports")},
                    {gen_mix.get("nuclear")},
                    {gen_mix.get("other")},
                    {gen_mix.get("solar")},
                    {gen_mix.get("wind")}
                );
            """
            try:
                c.execute(sql)
            except Exception as e:
                print(f"Error inserting: {e}")
                pass
        conn.commit()

    conn.close()


if __name__ == "__main__":
    fetch_intensity()
