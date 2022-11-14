"""
Fetch hourly temperature data for Ecodan heat pump
"""
import requests
import sqlite3
import os
from datetime import datetime, timedelta
from dateutil import rrule

HA_DB_URL = os.getenv("HA_DB_URL")


def get_hours(start_date):
    start_date = datetime.strptime(start_date[0:10], "%Y-%m-%d")
    for dt in rrule.rrule(rrule.HOURLY, count=24, dtstart=start_date):
        yield dt


def fetch_usage(num_days=1):
    "Fetches Temperature data from Mitsubishi"
    d1start = datetime.now() - timedelta(days=num_days)
    d1end = datetime.now() - timedelta(days=num_days - 1)
    start_date = d1start.strftime("%Y-%m-%dT00:00:00")
    end_date = d1end.strftime("%Y-%m-%dT00:00:00")

    endpoint_url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Report/GetTemperatureLog2"
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()
    sql = """
        SELECT
            LOWER(key),
            value 
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE LOWER(e.entity_name) = 'ecodan'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "device_id":
                creds["device_id"] = r[1]
            if r[0] == "mitsi_context_key":
                creds["mitsi_context_key"] = r[1]
            if r[0] == "location":
                creds["location"] = r[1]
    except Exception as e:
        raise Exception("Creds not found in DB")

    if "device_id" not in creds:
        raise Exception("Missing device_id in database")
    if "mitsi_context_key" not in creds:
        raise Exception("Missing mitsi_context_key in database")
    if "location" not in creds:
        raise Exception("Missing location in database")

    json_payload = {
        "DeviceId": creds["device_id"],
        "Duration": 1,
        "Location": creds["location"],
        "FromDate": start_date,
        "ToDate": end_date,
    }

    with requests.post(
        endpoint_url,
        headers={
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json; charset=UTF-8",
            "sec-ch-ua": '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "x-mitscontextkey": creds["mitsi_context_key"],
            "x-requested-with": "XMLHttpRequest",
            "Referer": "https://app.melcloud.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        json=json_payload,
    ) as res:
        if res.status_code == 200:
            hp_data = res.json()
            print(hp_data)
            data_rows = hp_data["Data"]
            for i, dthour in enumerate(get_hours(start_date)):
                row = {
                    "datetime": dthour.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "setTemperature": data_rows[0][i],
                    "insideTemperature": data_rows[1][i],
                    "outsideTemperature": data_rows[2][i],
                    "tankTemperature": data_rows[3][i],
                }
                # data_rows[4] is setTankTemperature (not valuable)
                # data_rows[5] is some variation on outsideTemperature

                sql = f"""
                    INSERT INTO Temperature (
                        datetime,
                        setTemperature,
                        insideTemperature,
                        outsideTemperature,
                        tankTemperature
                    )
                    VALUES (
                        '{row["datetime"]}',
                        {row["setTemperature"]},
                        {row["insideTemperature"]},
                        {row["outsideTemperature"]},
                        {row["tankTemperature"]}
                    );
                """
                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass
        else:
            print(f"Error code {res.status_code} fetching feed")

    conn.close()


if __name__ == "__main__":
    fetch_usage()
