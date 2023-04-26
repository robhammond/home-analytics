# Fetch data from Solis S3-WIFI-ST datalogger, and return it as a JSON object
import json
import logging
import os
import sqlite3
import requests

logging.basicConfig(level=logging.DEBUG)


HA_DB_URL = os.getenv("HA_DB_URL")


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
            LOWER(e.entity_name) = 's3-wifi-st'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            # set this as a static IP on your router
            if r[0] == "ip_addr":
                creds["ip_addr"] = r[1]
            # admin
            if r[0] == "user":
                creds["user"] = r[1]
            # your wifi password
            if r[0] == "password":
                creds["password"] = r[1]

    except Exception as e:
        raise Exception("Authorization details not found in DB")

    return creds

def get_now_generation():
    creds = _get_creds()
    url = f"http://{creds['ip_addr']}/inverter.cgi"

    with requests.get(url, auth=(creds["user"], creds["pass"])) as res:

        if res.status_code == 200:
            logger_content = res.content
            now_data = {
                "firmware_version": logger_content.split(";")[1],
                "inverter_model": logger_content.split(";")[2],
                "inverter_temperature": logger_content.split(";")[3],
                "current_power": logger_content.split(";")[4],
                "yield_today": logger_content.split(";")[5],
            }
            print(json.dumps(now_data, indent=4))

        else:
            print("error fetching data from datalogger")


if __name__ == "__main__":
    print(get_now_generation())