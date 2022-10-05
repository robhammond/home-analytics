import sqlite3
import re
from datetime import datetime, timedelta, timezone
import pytz
from datetimerange import DateTimeRange
import os

HA_DB_URL = os.getenv("HA_DB_URL")


def refresh_db():
    conn = sqlite3.connect(HA_DB_URL)
    conn.row_factory = sqlite3.Row  # enables using dict in rows
    c = conn.cursor()

    sql = """
        SELECT * 
        FROM electricity 
        WHERE 
            rateId IS NULL
    """

    usage = c.execute(sql).fetchall()

    for el in usage:
        dt = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
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

            for rate in rates:
                if rate["rate_type"] != "fixed":
                    # clone the actual date we're looking at
                    dt_start = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
                    dt_end = datetime.strptime(el["datetime_start"], "%Y-%m-%d %H:%M:%S")
                    bst = pytz.timezone("Europe/London")
                    dt_start = bst.localize(dt_start)
                    dt_end = bst.localize(dt_end)

                    # extract hour and minute of rate window
                    regex = r"^(\d\d):(\d\d)$"
                    start = re.search(regex, rate["start_time"])
                    end = re.search(regex, rate["end_time"])
                    start_hour = int(start.group(1))
                    start_min = int(start.group(2))
                    end_hour = int(end.group(1))
                    end_min = int(end.group(2))

                    # fake the start and end of this rate window
                    dt_start = dt_start.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)

                    dt_end = dt_end.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)

                    dt_end = dt_end + timedelta(days=1)
                    dt_end = dt_end - timedelta(seconds=1)

                    # print(f"Start: {dt_start}    End: {dt_end}")
                    time_range = DateTimeRange(dt_start, dt_end)

                    if dt in time_range:
                        # print(f"if {el_time} in time slots - set rate {rate['id']} ({rate['rate_type']})")

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


if __name__ == "__main__":
    refresh_db()
