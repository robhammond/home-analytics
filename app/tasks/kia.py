import os
import sqlite3
from datetime import datetime, timedelta
import pytz
from hyundai_kia_connect_api import *

HA_DB_URL = os.getenv("HA_DB_URL")


def update_vehicle_details():
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
            LOWER(e.entity_name) = 'kia'
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

    sql = """
        SELECT
            id,
            vin,
            model
        FROM Car
        WHERE 
            LOWER(make) = 'kia'
    """

    try:
        res = c.execute(sql).fetchall()
        creds["cars"] = []
        for r in res:
            creds["cars"].append({"id": r[0], "vin": r[1], "model": r[2]})
    except Exception as e:
        raise Exception(f"VIN not found in DB: {e}")

    vm = VehicleManager(
        region=1, brand=1, username=creds["username"], password=creds["password"], pin=""  # blank for EU market
    )
    vm.check_and_refresh_token()
    vm.update_all_vehicles_with_cached_state()
    # print(vm.vehicles)

    for vehicle_id in vm.vehicles.keys():
        vehicle_details = vm.get_vehicle(vehicle_id)
        for car in creds["cars"]:
            # hacky as what if there's 2 of the same model owned by an account?
            if vehicle_details.model.lower() != car["model"].lower():
                continue

            # print(vehicle_details)
            data = {}
            data["batteryPercent"] = vehicle_details.ev_battery_percentage
            data["odometer"] = vehicle_details.odometer
            data["odometerUnit"] = vehicle_details._odometer_unit
            data["estimatedRange"] = vehicle_details.ev_driving_range
            data["rangeUnit"] = vehicle_details._ev_driving_range_unit
            last_updated = vehicle_details.last_updated_at
            last_updated = last_updated.astimezone(pytz.utc)
            data["datetime"] = last_updated = datetime.strftime(last_updated, "%Y-%m-%dT%H:%M:%SZ")

            if vehicle_details.ev_battery_is_charging:
                data["chargingStatus"] = 1
            else:
                data["chargingStatus"] = 0

            if vehicle_details.is_locked:  # current package version is opposite
                data["isLocked"] = 0
            else:
                data["isLocked"] = 1
            data["chargingTargetPercent"] = vehicle_details.ev_charge_limits_ac

            print(data)

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
                    chargingStatus,
                    chargingTargetPercent,
                    isLocked
                )
                VALUES (
                    {car['id']},
                    '{data['datetime']}',
                    {data['odometer']},
                    '{data['odometerUnit']}',
                    '{data['batteryPercent']}',
                    {data['estimatedRange']},
                    '{data['rangeUnit']}',
                    {data['chargingStatus']},
                    {data['chargingTargetPercent']},
                    {data['isLocked']}
                )
            """
            try:
                c.execute(sql)
                conn.commit()
            except Exception as e:
                print(f"Error inserting: {e}")
                pass

        conn.close()


if __name__ == "__main__":
    update_vehicle_details()
