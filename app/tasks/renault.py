# Fetch data from Renault

from datetime import datetime, timedelta
import aiohttp
import asyncio
import os
import pytz
import sqlite3

from renault_api.renault_client import RenaultClient

HA_DB_URL = os.getenv("HA_DB_URL")


async def main():

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
            LOWER(e.entity_name) = 'renault'
    """
    creds = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            if r[0] == "user":
                creds["user"] = r[1]
            if r[0] == "password":
                creds["password"] = r[1]
            if r[0] == "locale":
                creds["locale"] = r[1]
    except Exception as e:
        raise Exception("Authorization details not found in DB")

    sql = """
        SELECT
            id,
            vin
        FROM Car
        WHERE 
            LOWER(make) = 'renault'
    """

    try:
        res = c.execute(sql).fetchall()
        creds["cars"] = []
        for r in res:
            creds["cars"].append({"id": r[0], "vin": r[1]})
    except Exception as e:
        raise Exception(f"VIN not found in DB: {e}")

    async with aiohttp.ClientSession() as websession:

        client = RenaultClient(websession=websession, locale=creds["locale"])
        await client.session.login(creds["user"], creds["password"])

        # Assuming only one account exists
        person = await client.get_person()
        account_id = person.accounts[0].accountId
        account = await client.get_api_account(account_id)

        for car in creds["cars"]:
            vehicle = await account.get_api_vehicle(car["vin"])
            cockpit_data = await vehicle.get_cockpit()
            data = {}
            data["odometer"] = cockpit_data.totalMileage
            data["odometerUnit"] = "km"
            # convert to miles
            # km_to_miles = 0.621371

            battery = await vehicle.get_battery_status()

            data["estimatedRange"] = battery.batteryAutonomy
            data["rangeUnit"] = "km"
            # estimated_range = int(estimated_range * km_to_miles)
            data["batteryPercent"] = battery.batteryLevel
            charging_status = battery.chargingStatus

            if charging_status == -1.0:
                # not charging
                data["chargingStatus"] = 0
            elif charging_status == 0.0:
                # not charging
                data["chargingStatus"] = 0
            elif charging_status == 0.1:
                # waiting for scheduled charge
                data["chargingStatus"] = 10
            elif charging_status == 0.2:
                # charge ended
                data["chargingStatus"] = 9
            elif charging_status == 0.3:
                # waiting for current charge
                data["chargingStatus"] = 2
            elif charging_status == 0.4:
                # energy flap opened
                data["chargingStatus"] = 20
            elif charging_status == 1.0:
                # charge in progress
                data["chargingStatus"] = 1
            else:
                # unknown
                data["chargingStatus"] = -1

            dt_checked = datetime.strptime(battery.timestamp, "%Y-%m-%dT%H:%M:%S%z")
            dt_checked = dt_checked.astimezone(pytz.utc)
            last_updated = datetime.strftime(dt_checked, "%Y-%m-%dT%H:%M:%SZ")
            data["datetime"] = last_updated

            sql = f"""
                INSERT INTO CarStatus 
                (
                    carId,
                    datetime,
                    odometer,
                    odometerUnit,
                    batteryPercent,
                    estimatedRange,
                    rangeUnit,
                    chargingStatus
                )
                VALUES (
                    {car['id']},
                    '{data['datetime']}',
                    {data['odometer']},
                    '{data['odometerUnit']}',
                    {data['batteryPercent']},
                    {data['estimatedRange']},
                    '{data['rangeUnit']}',
                    {data['chargingStatus']}
                )
            """
            try:
                c.execute(sql)
                conn.commit()
            except Exception as e:
                print(f"Error inserting: {e}")
                pass

        conn.close()


loop = asyncio.get_event_loop()
loop.run_until_complete(main())
