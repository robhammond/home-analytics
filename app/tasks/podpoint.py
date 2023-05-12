# Fetch data from Pod Point chargers

import requests
import json
import os
import pytz
import sqlite3
from datetime import datetime, date
import calendar

HA_DB_URL = os.getenv("HA_DB_URL")

AUTH = "/auth"
SESSIONS = "/sessions"
USERS = "/users"
PODS = "/pods"
UNITS = "/units"
CHARGE_SCHEDULES = "/charge-schedules"
CHARGES = "/charges"

API_BASE = "api.pod-point.com"
API_VERSION = "v4"
API_BASE_URL = "https://" + API_BASE + "/" + API_VERSION

# TIMEOUT=10
HEADERS = {
    "content-type": "application/json",
    "accept": "application/json",
    "accept-language": "en",
    "user-agent": "Pod Point Native Mobile App",
}

def get_user_pass():
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
            LOWER(e.entity_name) = 'pod point'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "username":
                creds["username"] = r[1]
            if r[0] == "password":
                creds["password"] = r[1]
    except Exception as e:
        raise Exception("Authorization details not found in DB")
    
    return creds


def get_cached_creds():
    conn = sqlite3.connect(HA_DB_URL)
    c = conn.cursor()
    sql = """
        SELECT
            key, 
            value,
            e.id AS entity_id
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE 
            LOWER(e.entity_name) = 'pod point'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        creds["entity_id"] = res[0][2]
        for r in res:
            if r[0] == "username":
                creds["username"] = r[1]
            if r[0] == "password":
                creds["password"] = r[1]
            if r[0] == "user_id":
                creds["user_id"] = r[1]
    except Exception as e:
        raise Exception("Authorization details not found in DB")

    if "user_id" not in creds:
        creds["user_id"] = get_user_id()

        sql = f"""
            INSERT INTO Credentials (entityId, key, value)
            VALUES ({creds["entity_id"]}, 'user_id', {creds["user_id"]})
        """
        try:
            c.execute(sql)
            conn.commit()
        except Exception as e:
            raise Exception(f"Error setting user_id value: {e}")

    conn.close()

    return creds


def get_access_token():
    creds = get_user_pass()
    # Authenticates and obtains an access token from PodPoint
    payload = {"username": creds["username"], "password": creds["password"]}
    with requests.post(f"{API_BASE_URL}{AUTH}", headers=HEADERS, json=payload) as res:
        if res.status_code == 200:
            data = res.json()
            access_token = data["access_token"]
            expires_in = data["expires_in"]
            refresh_token = data["refresh_token"]
            return f"Bearer {access_token}"
        else:
            raise Exception(f"Error getting Access Token: {res.status_code}")


def get_user_id():
    creds = get_user_pass()
    # Authenticates and obtains an access token from PodPoint
    payload = {"email": creds["username"], "password": creds["password"]}

    auth_string = get_access_token()
    HEADERS["Authorization"] = auth_string

    with requests.post(f"{API_BASE_URL}{SESSIONS}", headers=HEADERS, json=payload) as res:
        if res.status_code in [200, 201]:
            data = res.json()
            # session_id = data["sessions"]["id"]
            user_id = data["sessions"]["user_id"]
            return user_id
        else:
            raise Exception(f"Couldn't get User ID, got HTTP status code: {res.status_code}")


def get_account_details():
    # Gets your PodPoint UserID
    # these are the default request params, sent in a comma separated string
    # to a 'include' param
    default_request = [
        "account",
        # "account.payment",
        "vehicle",
        "vehicle.make",
        "vehicle.socket",
        "group",  # returns null
        "notifications",  # do you have notifications enabled on the app
        "unit.pod.unit_connectors",
        "unit.pod.address.tariff.tiers",
        "unit.pod.address.tariff.energy_supplier",
        "unit.pod.model",
    ]
    # probably worth saving json response you get for all of them
    with requests.get(
        f"{API_BASE_URL}{AUTH}",
        params={
            "include": "account,notifications,unit.pod.unit_connectors,unit.pod.address.tariff.tiers,unit.pod.address.tariff.energy_supplier,unit.pod.model"
        },
        headers=HEADERS,
    ) as res:
        data = res.json()
        print(data)
        # user id is data["users"]["id"]
        # unit id is data["users"]["unit"]["id"]
        # image is data["users"]["unit"]["pod"]["model"]["image_url"]


def get_charge_sessions(start_date=None, end_date=None):
    creds = get_cached_creds()

    if not start_date:
        today = datetime.now()
        # first day of month
        start_date = today.strftime("%Y-%m-01T00:00:00Z")
    else:
        start_date = f"{start_date}T00:00:00Z"

    if not end_date:
        today = datetime.now()
        last_dom = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
        # last day of month
        end_date = last_dom.strftime("%Y-%m-%dT23:59:59Z")
    else:
        end_date = f"{end_date}T23:59:59Z"

    # charges:
    charges_url = f"{API_BASE_URL}{USERS}/{creds['user_id']}{CHARGES}"

    with requests.get(
        charges_url,
        params={
            "perpage": "all",
            "type": "all",
            "from": start_date,
            "to": end_date,
            "view": "month",
        },
        headers=HEADERS,
    ) as res:
        if res.status_code == 200:
            json_data = res.json()
            # print(json.dumps(json_data, indent=4))

            conn = sqlite3.connect(HA_DB_URL)
            c = conn.cursor()

            for charge in json_data["charges"]:
                # skip if charge session is active
                if not charge["ends_at"]:
                    continue

                # only log home charges
                if not charge["location"]["home"]:
                    continue

                session = {}
                session["charging_duration"] = charge["charging_duration"]["raw"] or 0
                tmp_start = datetime.strptime(charge["starts_at"], "%Y-%m-%dT%H:%M:%S%z")
                tmp_end = datetime.strptime(charge["ends_at"], "%Y-%m-%dT%H:%M:%S%z")
                tmp_start = tmp_start.astimezone(pytz.utc)
                tmp_end = tmp_end.astimezone(pytz.utc)
                session["datetime_start"] = datetime.strftime(tmp_start, "%Y-%m-%dT%H:%M:%SZ")
                session["datetime_end"] = datetime.strftime(tmp_end, "%Y-%m-%dT%H:%M:%SZ")
                session["kwh_used"] = charge["kwh_used"]
                session["energy_cost"] = charge["energy_cost"] or None
                if session["energy_cost"]:
                    session["energy_cost"] = session["energy_cost"] / 100
                else:
                    session["energy_cost"] = "NULL"

                sql = f"""
                    INSERT INTO EntityUsage (
                        datetime_start,
                        datetime_end,
                        duration_seconds,
                        entityId,
                        granularity,
                        kwh_used,
                        energy_cost
                    ) VALUES (
                        '{session["datetime_start"]}',
                        '{session["datetime_end"]}',
                        {session["charging_duration"]},
                        {creds["entity_id"]},
                        'day',
                        {session["kwh_used"]},
                        {session["energy_cost"]}
                    )
                """

                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass

            conn.close()
        else:
            raise Exception(f"Error getting charges, status code {res.status_code}")


if __name__ == "__main__":
    auth_string = get_access_token()
    HEADERS["Authorization"] = auth_string
    get_charge_sessions()
