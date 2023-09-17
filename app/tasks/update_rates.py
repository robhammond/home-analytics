import sqlite3
import re
from datetime import datetime, timedelta, timezone
import pytz
from datetimerange import DateTimeRange
import os

HA_DB_URL = os.getenv("HA_DB_URL")


def update_import():
    conn = sqlite3.connect(HA_DB_URL)
    conn.row_factory = sqlite3.Row  # enables using dict in rows
    c = conn.cursor()

    # set rates for consumption
    sql = """
        SELECT * 
        FROM Electricity 
        WHERE 
            rateId IS NULL
    """

    usage = c.execute(sql).fetchall()

    for el in usage:
        try:
            dt = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            dt = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S%z")
        utc = pytz.timezone("UTC")
        dt = utc.localize(dt)

        hours = dt.strftime("%H")
        mins = dt.strftime("%M")
        el_time = f"{hours}:{mins}"
        date_str = dt.strftime("%Y-%m-%d")

        print(f"el_time {el_time} - {date_str}")

        sql = f"""
            SELECT
                id
            FROM
                Supplier s
            WHERE
                (
                    DATE(?) BETWEEN DATE(
                        s.supplier_start / 1000,
                        'unixepoch',
                        'localtime'
                    ) AND DATE(s.supplier_end / 1000, 'unixepoch', 'localtime')
                )
                OR (
                    DATE(?) >= DATE(
                        s.supplier_start / 1000,
                        'unixepoch',
                        'localtime'
                    )
                    AND s.supplier_end IS NULL
                )
                AND tariff_type = 'import'
        """
        suppl = c.execute(sql, (date_str, date_str)).fetchall()

        if suppl[0]:
            sql = f"""
                SELECT *
                FROM rates
                WHERE
                    supplierId = {suppl[0]["id"]}
            """
            rates = c.execute(sql).fetchall()

            # Define time zones
            utc = pytz.timezone("UTC")
            bst = pytz.timezone("Europe/London")

            for rate in rates:
                if rate["rate_type"] != "fixed":
                    # Get the actual datetime in UTC
                    actual_dt_utc = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
                    actual_dt_utc = utc.localize(actual_dt_utc)

                    # Convert to local time (BST)
                    actual_dt = actual_dt_utc.astimezone(bst)

                    # extract hour and minute of rate window
                    regex = r"^(\d\d):(\d\d)$"
                    start = re.search(regex, rate["start_time"])
                    end = re.search(regex, rate["end_time"])
                    start_hour = int(start.group(1))
                    start_min = int(start.group(2))
                    end_hour = int(end.group(1))
                    end_min = int(end.group(2))

                    # build dt_start and dt_end based on actual_dt (in BST)
                    dt_start = actual_dt.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                    dt_end = actual_dt.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)

                    # If end time is earlier than start time, it means the range crosses midnight
                    if dt_end.time() < dt_start.time():
                        # Shift dt_start to previous day and dt_end to the next day
                        dt_start = dt_start - timedelta(days=1)
                        dt_end = dt_end + timedelta(days=1)
                    else:
                        # This might be needed for cases where the end time is exactly at midnight
                        dt_end = dt_end - timedelta(seconds=1)

                    # Debug print statements
                    # print(f"rate: {rate['rate_type']}, start_time: {rate['start_time']}, end_time: {rate['end_time']}")
                    # print(f"actual_dt: {actual_dt}, dt_start: {dt_start}, dt_end: {dt_end}")

                    # Use <= for both ends of the range
                    if dt_start <= actual_dt <= dt_end:
                        print(f"Matching rate: {rate['rate_type']}")  # Debug print statement

                        sql = f"""
                            UPDATE
                                electricity
                            SET
                                rateId = ?
                            WHERE
                                id = ?
                        """
                        c.execute(sql, (rate["id"], el["id"]))
                        conn.commit()
                else:
                    sql = f"""
                        UPDATE
                            electricity
                        SET
                            rateId = ?
                        WHERE 
                            id = ?
                    """
                    c.execute(sql, (rate["id"], el["id"]))
                    conn.commit()
                    pass

    conn.close()


def update_export():
    conn = sqlite3.connect(HA_DB_URL)
    conn.row_factory = sqlite3.Row  # enables using dict in rows
    c = conn.cursor()
    # set rates for production
    sql = """
        SELECT * 
        FROM Electricity 
        WHERE 
            exportRateId IS NULL
            /*AND 
            datetime_start >= DATE(
                strftime('%s', 'now', '-7 days'),
                'unixepoch',
                'localtime'
            )*/
    """

    usage = c.execute(sql).fetchall()

    for el in usage:
        try:
            dt = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            dt = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S%z")
        utc = pytz.timezone("UTC")
        dt = utc.localize(dt)

        hours = dt.strftime("%H")
        mins = dt.strftime("%M")
        el_time = f"{hours}:{mins}"
        date_str = dt.strftime("%Y-%m-%d")

        print(f"el_time {el_time} - {date_str}")

        sql = f"""
            SELECT
                id
            FROM
                Supplier s
            WHERE
                (
                    DATE(?) BETWEEN DATE(
                        s.supplier_start / 1000,
                        'unixepoch',
                        'localtime'
                    ) AND DATE(s.supplier_end / 1000, 'unixepoch', 'localtime')
                )
                OR (
                    DATE(?) >= DATE(
                        s.supplier_start / 1000,
                        'unixepoch',
                        'localtime'
                    )
                    AND s.supplier_end IS NULL
                )
                AND tariff_type = 'export'
        """
        try:
            suppl = c.execute(sql, (date_str, date_str)).fetchall()

            if suppl[0]:
                sql = f"""
                    SELECT *
                    FROM rates
                    WHERE
                        supplierId = {suppl[0]["id"]}
                """
                rates = c.execute(sql).fetchall()

                # Define time zones
                utc = pytz.timezone("UTC")
                bst = pytz.timezone("Europe/London")

                for rate in rates:
                    if rate["rate_type"] != "fixed":
                        # Get the actual datetime in UTC
                        actual_dt_utc = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
                        actual_dt_utc = utc.localize(actual_dt_utc)

                        # Convert to local time (BST)
                        actual_dt = actual_dt_utc.astimezone(bst)

                        # extract hour and minute of rate window
                        regex = r"^(\d\d):(\d\d)$"
                        start = re.search(regex, rate["start_time"])
                        end = re.search(regex, rate["end_time"])
                        start_hour = int(start.group(1))
                        start_min = int(start.group(2))
                        end_hour = int(end.group(1))
                        end_min = int(end.group(2))

                        # build dt_start and dt_end based on actual_dt (in BST)
                        dt_start = actual_dt.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                        dt_end = actual_dt.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)

                        # If end time is earlier than start time, it means the range crosses midnight
                        if dt_end.time() < dt_start.time():
                            # Shift dt_start to previous day and dt_end to the next day
                            dt_start = dt_start - timedelta(days=1)
                            dt_end = dt_end + timedelta(days=1)
                        else:
                            # This might be needed for cases where the end time is exactly at midnight
                            dt_end = dt_end - timedelta(seconds=1)

                        # Debug print statements
                        # print(f"rate: {rate['rate_type']}, start_time: {rate['start_time']}, end_time: {rate['end_time']}")
                        # print(f"actual_dt: {actual_dt}, dt_start: {dt_start}, dt_end: {dt_end}")

                        # Use <= for both ends of the range
                        if dt_start <= actual_dt <= dt_end:
                            print(f"Matching rate: {rate['rate_type']}")  # Debug print statement

                            sql = f"""
                                UPDATE
                                    electricity
                                SET
                                    exportRateId = ?
                                WHERE
                                    id = ?
                            """
                            c.execute(sql, (rate["id"], el["id"]))
                            conn.commit()
                    else:
                        sql = f"""
                            UPDATE
                                electricity
                            SET
                                exportRateId = ?
                            WHERE 
                                id = ?
                        """
                        c.execute(sql, (rate["id"], el["id"]))
                        conn.commit()
                        pass
        except Exception as e:
            print(f"Error: {e}")
            pass
    conn.close()


def refresh_db():
    update_import()
    update_export()


if __name__ == "__main__":
    refresh_db()
