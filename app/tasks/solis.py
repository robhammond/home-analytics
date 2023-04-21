# Fetch data from Solis Cloud API
import base64
import calendar
import hashlib
import hmac
import json
import logging
import os
import re
import sqlite3
from datetime import date, datetime, timedelta
from requests.adapters import HTTPAdapter, Retry
import pytz
import requests

logging.basicConfig(level=logging.DEBUG)


HA_DB_URL = os.getenv("HA_DB_URL")

API_BASE = "https://www.soliscloud.com:13333"


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


def _get_digest(body_string):
    try:
        md5hash = hashlib.md5(body_string.encode("utf-8")).digest()
        result = base64.b64encode(md5hash).decode("utf-8")
    except Exception as e:
        print(e)
        result = ""
    return result


def _get_formatted_time():
    now = datetime.utcnow()
    formatted_time = now.strftime("%a, %d %b %Y %H:%M:%S GMT")
    return formatted_time


def get_inverter_day(request_date):
    """
    Refer to p29 (3.15) of the Solis Cloud API documentation
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/inverterDay"  # or the actual API resource path
    endpoint_url = f"{API_BASE}{canonicalized_resource}"

    formatted_time = _get_formatted_time()

    request_body = json.dumps(
        {
            "money": "GBP",
            "time": request_date,
            "timeZone": 0,
            "id": creds["inverter_id"],
            "sn": creds["inverter_sn"],
        }
    )
    request_verb = "POST"  # or whatever HTTP verb you're using
    content_md5 = _get_digest(str(request_body))  # or the actual MD5 hash of the request body, if present
    content_type = "application/json"  # or the actual Content-Type of the request, if present

    string_to_sign = f"{request_verb}\n{content_md5}\n{content_type}\n{formatted_time}\n{canonicalized_resource}"

    signature = hmac.new(creds["key_secret"].encode(), string_to_sign.encode(), hashlib.sha1).digest()
    signature_b64 = base64.b64encode(signature).decode()

    # construct the Authorization header
    authorization = f"API {creds['key_id']}:{signature_b64}"

    headers = {
        "Authorization": authorization,
        "Date": formatted_time,
        "Content-Type": content_type,
        "Content-MD5": content_md5,
    }

    # print(headers)
    # print(request_body)

    # retry as api has tendency to 502
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
    with requests.Session() as session:
        session.mount("https://", HTTPAdapter(max_retries=retries))
        session.mount("http://", HTTPAdapter(max_retries=retries))

        req = session.post(endpoint_url, headers=headers, data=request_body)
        if req.status_code == 200:
            res_json = req.json()
            print(f'Response: {res_json["msg"]}\nCode: {res_json["code"]}\nSuccess: {res_json["success"]}')
            print(res_json["code"])
            print(json.dumps(res_json["data"], indent=4))
            for data in res_json["data"]:
                solar = {
                    'data_timestamp': data['dataTimestamp'],
                    'time_str': data['timeStr'],
                    'ac_output_type': data['acOutputType'],
                    'dc_input_type': data['dcInputType'],
                    'state': data['state'],
                    'time': data['time'],
                    'pac': data['pac'],
                    'pac_str': data['pacStr'],
                    'pac_pec': data['pacPec'],
                    'e_today': data['eToday'],
                    'e_total': data['eTotal'],
                    'inverter_temperature': data['inverterTemperature'],
                    'power_factor': data['powerFactor'],
                    'fac': data['fac'],
                    'storage_battery_voltage': data['storageBatteryVoltage'],
                    'storage_battery_current': data['storageBatteryCurrent'],
                    'llc_bus_voltage': data['llcBusVoltage'],
                    'dc_bus': data['dcBus'],
                    'dc_bus_half': data['dcBusHalf'],
                    'bypass_ac_voltage': data['bypassAcVoltage'],
                    'bypass_ac_current': data['bypassAcCurrent'],
                    'battery_capacity_soc': data['batteryCapacitySoc'],
                    'battery_health_soh': data['batteryHealthSoh'],
                    'battery_power': data['batteryPower'],
                    'battery_voltage': data['batteryVoltage'],
                    'bsttery_current': data['bstteryCurrent'],
                    'battery_charging_current': data['batteryChargingCurrent'],
                    'battery_discharge_limiting': data['batteryDischargeLimiting'],
                    'family_load_power': data['familyLoadPower'],
                    'bypass_load_power': data['bypassLoadPower'],
                    'battery_total_charge_energy': data['batteryTotalChargeEnergy'],
                    'battery_today_charge_energy': data['batteryTodayChargeEnergy'],
                    'battery_total_discharge_energy': data['batteryTotalDischargeEnergy'],
                    'battery_today_discharge_energy': data['batteryTodayDischargeEnergy'],
                    'grid_purchased_total_energy': data['gridPurchasedTotalEnergy'],
                    'grid_purchased_today_energy': data['gridPurchasedTodayEnergy'],
                    'grid_sell_total_energy': data['gridSellTotalEnergy'],
                    'grid_sell_today_energy': data['gridSellTodayEnergy'],
                    'home_load_total_energy': data['homeLoadTotalEnergy'],
                    'home_load_today_energy': data['homeLoadTodayEnergy'],
                    'time_zone': data['timeZone'],
                    'battery_type': data['batteryType'],
                    'soc_discharge_set': data['socDischargeSet'],
                    'soc_charging_set': data['socChargingSet'],
                    'epm_fail_safe': data['epmFailSafe'],
                    'grid_total_power': data['pSum']
                }
                # Todo: do something with this data
        elif req.status_code in retries.status_forcelist:
            print(f"Retryable error, status code: {req.status_code}")
        else:
            print(f"Non-retryable error, status code: {req.status_code}")


def get_station_day(request_date):
    """
    Refer to p27 (3.10) of the Solis Cloud API documentation
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/stationDay"  # or the actual API resource path
    endpoint_url = f"{API_BASE}{canonicalized_resource}"

    formatted_time = _get_formatted_time()

    request_body = json.dumps(
        {
            "money": "GBP",
            "time": request_date,
            "timeZone": 0,
            "id": creds["station_id"],
        }
    )
    request_verb = "POST"  # or whatever HTTP verb you're using
    content_md5 = _get_digest(str(request_body))  # or the actual MD5 hash of the request body, if present
    content_type = "application/json"  # or the actual Content-Type of the request, if present

    string_to_sign = f"{request_verb}\n{content_md5}\n{content_type}\n{formatted_time}\n{canonicalized_resource}"

    signature = hmac.new(creds["key_secret"].encode(), string_to_sign.encode(), hashlib.sha1).digest()
    signature_b64 = base64.b64encode(signature).decode()

    # construct the Authorization header
    authorization = f"API {creds['key_id']}:{signature_b64}"

    headers = {
        "Authorization": authorization,
        "Date": formatted_time,
        "Content-Type": content_type,
        "Content-MD5": content_md5,
    }
    # print(headers)
    # print(request_body)

    # retry as api has tendency to 502
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
    session = requests.Session()
    session.mount(endpoint_url, HTTPAdapter(max_retries=retries))

    req = session.post(endpoint_url, headers=headers, data=request_body)
    if req.status_code == 200:
        res_json = req.json()
        print(f'Response: {res_json["msg"]}\nCode: {res_json["code"]}\nSuccess: {res_json["success"]}')
        print(json.dumps(res_json, indent=4))

        for row in res_json["data"]:
            # parse a unix timestamp to a datetime object

            dt_start = datetime.fromtimestamp(row["time"] / 1000)
            print(dt_start)
            print(row)

    elif req.status_code in retries.status_forcelist:
        print(f"Retryable error, status code: {req.status_code}")
    else:
        print(f"Non-retryable error, status code: {req.status_code}")


def get_station_list():
    """
    Station details - shows top-level details of all stations
    """
    creds = _get_creds()
    canonicalized_resource = "/v1/api/userStationList"  # or the actual API resource path
    endpoint_url = f"{API_BASE}{canonicalized_resource}"
    formatted_time = _get_formatted_time()

    request_body = json.dumps({"pageNo": 1, "pageSize": 10})
    request_verb = "POST"  # or whatever HTTP verb you're using
    content_md5 = _get_digest(str(request_body))  # or the actual MD5 hash of the request body, if present
    content_type = "application/json"  # or the actual Content-Type of the request, if present

    string_to_sign = f"{request_verb}\n{content_md5}\n{content_type}\n{formatted_time}\n{canonicalized_resource}"

    signature = hmac.new(creds["key_secret"].encode(), string_to_sign.encode(), hashlib.sha1).digest()
    signature_b64 = base64.b64encode(signature).decode()

    # construct the Authorization header
    authorization = f"API {creds['key_id']}:{signature_b64}"

    headers = {
        "Authorization": authorization,
        "Date": formatted_time,
        "Content-Type": content_type,
        "Content-MD5": content_md5,
    }

    print("making request")
    with requests.post(endpoint_url, headers=headers, data=request_body) as req:
        if req.status_code == 200:
            res_json = req.json()
            print(json.dumps(res_json["data"], indent=4))
        else:
            print(req.status_code)


if __name__ == "__main__":
    # get_inverter_day("2023-04-18")
    get_station_day("2023-04-16")
    # get_station_list()
