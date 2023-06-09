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


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch energy data for a specific date or date range.")
    parser.add_argument("--date", type=str, help="Single date in the format YYYY-MM-DD.")
    parser.add_argument("--start_date", type=str, help="Start date in the format YYYY-MM-DD.")
    parser.add_argument("--end_date", type=str, help="End date in the format YYYY-MM-DD.")
    parser.add_argument("--unit", type=str, help="Time unit - either mins or day.")
    return parser.parse_args()


HA_DB_URL = os.getenv("HA_DB_URL")

API_BASE = "https://www.soliscloud.com:13333"
VERB = "POST"


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
            LOWER(e.entity_name) LIKE 'solis%'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "key_id":
                creds["key_id"] = int(r[1])

            if r[0] == "key_secret":
                creds["key_secret"] = r[1]

            if r[0] == "inverter_id":
                creds["inverter_id"] = int(r[1])

            if r[0] == "station_id":
                creds["station_id"] = int(r[1])

            if r[0] == "inverter_sn":
                creds["inverter_sn"] = r[1]
    except Exception as e:
        raise Exception("Authorization details not found in DB")

    return creds


def _prepare_header(creds, body: dict[str, str], canonicalized_resource: str) -> dict[str, str]:
    # credit to
    # https://github.com/hultenvp/solis-sensor/blob/master/custom_components/solis/soliscloud_api.py
    content_md5 = base64.b64encode(hashlib.md5(json.dumps(body, separators=(",", ":")).encode("utf-8")).digest()).decode("utf-8")

    content_type = "application/json"

    now = datetime.now(timezone.utc)
    date = now.strftime("%a, %d %b %Y %H:%M:%S GMT")

    encrypt_str = VERB + "\n" + content_md5 + "\n" + content_type + "\n" + date + "\n" + canonicalized_resource
    hmac_obj = hmac.new(str.encode(creds["key_secret"]), msg=encrypt_str.encode("utf-8"), digestmod=hashlib.sha1)
    sign = base64.b64encode(hmac_obj.digest())
    authorization = "API " + str(creds["key_id"]) + ":" + sign.decode("utf-8")

    header: dict[str, str] = {
        "Content-MD5": content_md5,
        "Content-Type": content_type,
        "Date": date,
        "Authorization": authorization,
    }
    return header


def get_inverter_day(request_date):
    """
    Refer to p29 (3.15) of the Solis Cloud API documentation
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/inverterDay"
    endpoint_url = f"{API_BASE}{canonicalized_resource}"

    request_body = json.dumps(
        {
            "money": "GBP",
            "time": request_date,
            "timeZone": 0,
            "id": creds["inverter_id"],
            "sn": creds["inverter_sn"],
        }
    )

    headers = _prepare_header(creds, request_body, canonicalized_resource)

    with requests.post(endpoint_url, headers=headers, json=request_body) as res:
        if res.status_code == 200:
            res_json = res.json()
            print(f'Response: {res_json["msg"]}\nCode: {res_json["code"]}\nSuccess: {res_json["success"]}')
            print(res_json["code"])
            print(json.dumps(res_json["data"], indent=4))
            for data in res_json["data"]:
                solar = {
                    "data_timestamp": data["dataTimestamp"],
                    "time_str": data["timeStr"],
                    "ac_output_type": data["acOutputType"],
                    "dc_input_type": data["dcInputType"],
                    "state": data["state"],
                    "time": data["time"],
                    "pac": data["pac"],
                    "pac_str": data["pacStr"],
                    "pac_pec": data["pacPec"],
                    "e_today": data["eToday"],
                    "e_total": data["eTotal"],
                    "inverter_temperature": data["inverterTemperature"],
                    "power_factor": data["powerFactor"],
                    "fac": data["fac"],
                    "storage_battery_voltage": data["storageBatteryVoltage"],
                    "storage_battery_current": data["storageBatteryCurrent"],
                    "llc_bus_voltage": data["llcBusVoltage"],
                    "dc_bus": data["dcBus"],
                    "dc_bus_half": data["dcBusHalf"],
                    "bypass_ac_voltage": data["bypassAcVoltage"],
                    "bypass_ac_current": data["bypassAcCurrent"],
                    "battery_capacity_soc": data["batteryCapacitySoc"],
                    "battery_health_soh": data["batteryHealthSoh"],
                    "battery_power": data["batteryPower"],
                    "battery_voltage": data["batteryVoltage"],
                    "bsttery_current": data["bstteryCurrent"],
                    "battery_charging_current": data["batteryChargingCurrent"],
                    "battery_discharge_limiting": data["batteryDischargeLimiting"],
                    "family_load_power": data["familyLoadPower"],
                    "bypass_load_power": data["bypassLoadPower"],
                    "battery_total_charge_energy": data["batteryTotalChargeEnergy"],
                    "battery_today_charge_energy": data["batteryTodayChargeEnergy"],
                    "battery_total_discharge_energy": data["batteryTotalDischargeEnergy"],
                    "battery_today_discharge_energy": data["batteryTodayDischargeEnergy"],
                    "grid_purchased_total_energy": data["gridPurchasedTotalEnergy"],
                    "grid_purchased_today_energy": data["gridPurchasedTodayEnergy"],
                    "grid_sell_total_energy": data["gridSellTotalEnergy"],
                    "grid_sell_today_energy": data["gridSellTodayEnergy"],
                    "home_load_total_energy": data["homeLoadTotalEnergy"],
                    "home_load_today_energy": data["homeLoadTodayEnergy"],
                    "time_zone": data["timeZone"],
                    "battery_type": data["batteryType"],
                    "soc_discharge_set": data["socDischargeSet"],
                    "soc_charging_set": data["socChargingSet"],
                    "epm_fail_safe": data["epmFailSafe"],
                    "grid_total_power": data["pSum"],
                }
                # Todo: do something with this data
        elif res.status_code == 502:
            # try again after sleep
            sleep(30)
            get_inverter_day(request_date)
        else:
            print(f"Error: {res.status_code}")


def get_station_day(request_date):
    """
    Refer to p27 (3.10) of the Solis Cloud API documentation
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/stationDay"  # or the actual API resource path
    endpoint_url = f"{API_BASE}{canonicalized_resource}"
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()

    request_body = {
        "money": "GBP",
        "time": request_date,
        "timeZone": 0,
        "id": creds["station_id"],
    }
    headers = _prepare_header(creds, request_body, canonicalized_resource)

    with requests.post(endpoint_url, headers=headers, json=request_body) as res:
        if res.status_code == 200:
            res_json = res.json()
            print(json.dumps(res_json, indent=4))

            if res_json.get("success"):

                for row in res_json.get("data"):
                    data = {
                        "kwh_consumed": (row["consumeEnergy"] / 1000),
                        "kwh_produced": (row["produceEnergy"] / 1000),
                    }
                    battery_power_watts = row["batteryPower"]
                    if battery_power_watts > 0:
                        data["kwh_battery_charge"] = (battery_power_watts / 1000)
                        data["kwh_battery_discharge"] = 0
                    else:
                        data["kwh_battery_charge"] = 0
                        data["kwh_battery_discharge"] = (battery_power_watts / 1000)

                    energy_kwh = (row["psum"] / 1000)
                    if energy_kwh < 0:
                        data["kwh_imported"] = energy_kwh
                        data["kwh_exported"] = 0
                    else:
                        data["kwh_imported"] = 0
                        data["kwh_exported"] = energy_kwh

                    data["datetime_start"] = f"{request_date}T{row['timeStr']}Z"
                    datetime_start = datetime.strptime(data["datetime_start"], "%Y-%m-%dT%H:%M:%SZ")
                    # Add 5 minutes to the start time
                    datetime_end = datetime_start + timedelta(minutes=5)
                    # Convert the end time back to a string
                    data["datetime_end"] = datetime_end.strftime("%Y-%m-%dT%H:%M:%SZ")

                    sql = """
                        INSERT INTO solar (
                            datetime_start,
                            datetime_end,
                            kwh_produced,
                            kwh_consumed,
                            kwh_exported,
                            kwh_imported,
                            kwh_battery_charge,
                            kwh_battery_discharge,
                            time_unit
                        ) VALUES (
                            :datetime_start,
                            :datetime_end,
                            :kwh_produced,
                            :kwh_consumed,
                            :kwh_exported,
                            :kwh_imported,
                            :kwh_battery_charge,
                            :kwh_battery_discharge,
                            '5min'
                        )
                    """

                    try:
                        c.execute(sql, data)
                    except Exception as e:
                        print(f"Error inserting: {e}")
                        pass
                conn.commit()

        elif res.status_code == 502:
            # try again after sleep
            sleep(30)
            get_station_day(request_date)
        else:
            print(f"Error status code: {res.status_code}")
            print(res.content)


def get_station_day_energy_list(request_date):
    """
    Refer to p43 (3.27) of the Solis Cloud API documentation
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/stationDayEnergyList"  # or the actual API resource path
    endpoint_url = f"{API_BASE}{canonicalized_resource}"
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()

    request_body = {
        "money": "GBP",
        "time": request_date,
        "timeZone": 0,
        "id": creds["station_id"],
    }
    headers = _prepare_header(creds, request_body, canonicalized_resource)

    with requests.post(endpoint_url, headers=headers, json=request_body) as res:
        if res.status_code == 200:
            res_json = res.json()
            print(json.dumps(res_json, indent=4))

            if res_json.get("success"):

                for row in res_json.get("data").get("records"):
                    data = {
                        "kwh_consumed": row["consumeEnergy"],
                        "kwh_produced": row["produceEnergy"],
                        "kwh_battery_charge": row["batteryChargeEnergy"],
                        "kwh_battery_discharge": row["batteryDischargeEnergy"],
                        "kwh_imported": row["gridPurchasedEnergy"],
                        "kwh_exported": row["gridSellEnergy"],
                        "datetime_start": f"{request_date}T00:00:00Z",
                    }

                    sql = """
                        INSERT INTO solar (
                            datetime_start,
                            kwh_produced,
                            kwh_consumed,
                            kwh_exported,
                            kwh_imported,
                            kwh_battery_charge,
                            kwh_battery_discharge,
                            time_unit
                        ) VALUES (
                            :datetime_start,
                            :kwh_produced,
                            :kwh_consumed,
                            :kwh_exported,
                            :kwh_imported,
                            :kwh_battery_charge,
                            :kwh_battery_discharge,
                            'day'
                        )
                    """

                    try:
                        c.execute(sql, data)
                    except Exception as e:
                        print(f"Error inserting: {e}")
                        pass
                conn.commit()

        elif res.status_code == 502:
            # try again after sleep
            sleep(30)
            get_station_day(request_date)
        else:
            print(f"Error status code: {res.status_code}")
            print(res.content)


def get_station_list():
    """
    Station details - shows top-level details of all stations
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/userStationList"
    endpoint_url = f"{API_BASE}{canonicalized_resource}"
    print(endpoint_url)

    request_body = {
        "pageNo": 1,
        "pageSize": 10,
    }
    headers = _prepare_header(creds, request_body, canonicalized_resource)
    # print(headers)
    # print(request_body)

    with requests.post(endpoint_url, headers=headers, json=request_body) as res:
        if res.status_code == 200:
            res_json = res.json()
            print(f'Response: {res_json["msg"]}\nCode: {res_json["code"]}\nSuccess: {res_json["success"]}')
            print(json.dumps(res_json, indent=4))

            for station in res_json["data"]["page"]["records"]:
                station_data = {}
                station_data["station_id"] = station["id"]
                station_data["datetime_created"] = datetime.fromtimestamp(station["createDate"] / 1000)  # datetime of first switch on (unix timestamp)
                station_data["datetime_updated"] = datetime.fromtimestamp(station["updateDate"] / 1000)  # datetime of this update (unix timestamp)
                station_data["energy_today"] = station["dayEnergy"]  # total energy generated today (float kwh)
                station_data["energy_this_month"] = station["monthEnergy"]  # total energy generated since first switch on (float kwh)
                station_data["energy_this_year"] = station["yearEnergy"]  # total energy generated since first switch on (float kwh)
                station_data["energy_all_time"] = station["allEnergy"]  # total energy generated since first switch on (float kwh)
                station_data["battery_discharge_total"] = station["batteryTotalDischargeEnergy"]  # total energy discharged from battery (float kwh)
                station_data["battery_charge_total"] = station["batteryTotalChargeEnergy"]  # total energy charged into battery (float kwh)
                station_data["battery_discharge_today"] = station["batteryTodayDischargeEnergy"]  # total energy discharged from battery today (float kwh)
                station_data["battery_charge_today"] = station["batteryTodayChargeEnergy"]  # total energy charged into battery today (float kwh)
                station_data["grid_purchased_total"] = station["gridPurchasedTotalEnergy"]  # total energy purchased from grid (float kwh)
                station_data["grid_purchased_today"] = station["gridPurchasedTodayEnergy"]  # today energy purchased from grid (float kwh)
                station_data["grid_sell_total"] = station["gridSellTotalEnergy"]  # total energy purchased from grid (float kwh)
                station_data["grid_sell_today"] = station["gridSellTodayEnergy"]  # today energy purchased from grid (float kwh)
                station_data["home_load_total"] = station["homeLoadTotalEnergy"]  # total energy purchased from grid (float kwh)
                station_data["home_load_today"] = station["homeLoadTodayEnergy"]  # total energy purchased from grid (float kwh)
                # parse a unix timestamp to a datetime object
                print(station_data)
        else:
            print(f"Status code: {res.status_code}")
            # Bad Gateway errors are common, so retry after a delay
            if res.status_code == 502:
                sleep(30)
                get_station_list()


def main():
    args = parse_args()

    if args.date:
        if args.unit == 'mins':
            get_station_day(args.date)
        else:
            get_station_day_energy_list(args.date)
    elif args.start_date and args.end_date:
        start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(args.end_date, "%Y-%m-%d")
        delta = timedelta(days=1)

        while start_date <= end_date:
            date_str = start_date.strftime("%Y-%m-%d")
            if args.unit == 'mins':
                get_station_day(date_str)
            else:
                get_station_day_energy_list(date_str)
            start_date += delta
            sleep(10)
    else:
        # Calculate yesterday's date
        yesterday = datetime.now() - timedelta(days=1)
        # Format yesterday's date as a string in the "%Y-%m-%d" format
        yesterday_str = yesterday.strftime("%Y-%m-%d")

        if args.unit == 'mins':
            get_station_day(yesterday_str)
        else:
            get_station_day_energy_list(yesterday_str)


if __name__ == "__main__":
    main()
