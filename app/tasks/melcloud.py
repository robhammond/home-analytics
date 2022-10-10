"""
Fetch Ecodan heat pump data
"""
import requests
import sqlite3
import os
from datetime import datetime, timedelta

HA_DB_URL = os.getenv("HA_DB_URL")


def daterange(start_date, end_date):
    start_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_date = datetime.strptime(end_date, "%Y-%m-%d")
    for n in range(int((end_date - start_date).days)):
        yield start_date + timedelta(n)


def fetch_usage(start_date=None, end_date=None):
    "Fetches Heat Pump data from Mitsubishi"
    if not start_date:
        today = datetime.now()
        last_week = today - timedelta(days=8)
        start_date = last_week.strftime("%Y-%m-%dT00:00:00")
    else:
        start_date = f"{start_date}T00:00:00"

    if not end_date:
        today = datetime.now()
        # their limit ends at midnight of the following day, rather than 23:59 of the preceding day
        end_date = today.strftime("%Y-%m-%dT00:00:00")
    else:
        end_date = f"{end_date}T00:00:00"

    endpoint_url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/EnergyCost/Report"
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
    except Exception as e:
        raise Exception("Creds not found in DB")

    if "device_id" not in creds:
        raise Exception("Missing device_id in database")
    if "mitsi_context_key" not in creds:
        raise Exception("Missing mitsi_context_key in database")

    print(f"{start_date} ---> {end_date}")

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
        json={
            "DeviceId": creds["device_id"],
            "FromDate": start_date,
            "ToDate": end_date,
            "UseCurrency": False,
        },
    ) as res:
        if res.status_code == 200:
            hp_data = res.json()
            print(hp_data)
            data = {
                "hot_water": [],
                "cooling": [],
                "heating": [],
            }
            # loop thru date
            for i, single_date in enumerate(daterange(start_date[0:10], end_date[0:10])):
                if hp_data["ProducedHotWater"][i] != 0 and hp_data["HotWater"][i] != 0:
                    hot_water_cop = round((hp_data["ProducedHotWater"][i] / hp_data["HotWater"][i]), 4)
                else:
                    hot_water_cop = 0
                if hp_data["ProducedCooling"][i] != 0 and hp_data["Cooling"][i] != 0:
                    cooling_cop = round((hp_data["ProducedCooling"][i] / hp_data["Cooling"][i]), 4)
                else:
                    cooling_cop = 0
                if hp_data["ProducedHeating"][i] != 0 and hp_data["Heating"][i] != 0:
                    heating_cop = round((hp_data["ProducedHeating"][i] / hp_data["Heating"][i]), 4)
                else:
                    heating_cop = 0

                data["hot_water"].append(
                    {
                        "datetime": single_date.strftime("%Y-%m-%d"),
                        "kwh_consumed": hp_data["HotWater"][i],
                        "kwh_produced": hp_data["ProducedHotWater"][i],
                        "hot_water_cop": hot_water_cop,
                    }
                )
                data["cooling"].append(
                    {
                        "datetime": single_date.strftime("%Y-%m-%d"),
                        "kwh_consumed": hp_data["Cooling"][i],
                        "kwh_produced": hp_data["ProducedCooling"][i],
                        "cooling_cop": cooling_cop,
                    }
                )
                data["heating"].append(
                    {
                        "datetime": single_date.strftime("%Y-%m-%d"),
                        "kwh_consumed": hp_data["Heating"][i],
                        "kwh_produced": hp_data["ProducedHeating"][i],
                        "heating_cop": heating_cop,
                    }
                )

            for value in data["hot_water"]:

                sql = f"""
                    INSERT INTO HotWater (
                        datetime,
                        kwh_consumed,
                        kwh_produced,
                        hot_water_cop,
                        granularity
                    ) 
                    VALUES (
                        '{value["datetime"]}',
                        {value["kwh_consumed"]},
                        {value["kwh_produced"]},
                        {value["hot_water_cop"]},
                        'daily'
                    );
                """
                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass

            for value in data["cooling"]:

                sql = f"""
                    INSERT INTO Cooling (
                        datetime,
                        kwh_consumed,
                        kwh_produced,
                        cooling_cop,
                        granularity
                    ) 
                    VALUES (
                        '{value["datetime"]}',
                        {value["kwh_consumed"]},
                        {value["kwh_produced"]},
                        {value["cooling_cop"]},
                        'daily'
                    );
                """
                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass

            for value in data["heating"]:

                sql = f"""
                    INSERT INTO Heating (
                        datetime,
                        kwh_consumed,
                        kwh_produced,
                        heating_cop,
                        granularity
                    ) 
                    VALUES (
                        '{value["datetime"]}',
                        {value["kwh_consumed"]},
                        {value["kwh_produced"]},
                        {value["heating_cop"]},
                        'daily'
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

