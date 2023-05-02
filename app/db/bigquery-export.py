import os
import pytz
import sqlite3
from datetime import datetime, timedelta, date
from google.cloud import bigquery
from fastavro import writer as avro_writer, parse_schema as avro_parse_schema

local_db = os.getenv("HA_DB_URL", "./prod.db")
gcp_project = os.getenv("GCP_PROJECT")
# create a service account and rename the JSON file to 'bigquery-creds.json'
sa_creds_file = "/var/www/home-analytics/app/db/bigquery-creds.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = sa_creds_file
bq_client = bigquery.Client(project=gcp_project)

conn = sqlite3.connect(local_db)
conn.row_factory = sqlite3.Row
c = conn.cursor()

USAGE_SCHEMA = {
    "doc": "Usage",
    "name": "Usage",
    "namespace": "homeanalytics",
    "type": "record",
    "fields": [
        {"name": "name", "type": ["string", "null"]},
        {"name": "category", "type": ["string", "null"]},
        {"name": "subcategory", "type": ["string", "null"]},
        {"name": "kwh_consumed", "type": ["float", "null"]},
        {"name": "kwh_produced", "type": ["float", "null"]},
        {"name": "unit", "type": ["string", "null"]},
        {"name": "source", "type": ["string", "null"]},
        {"name": "cost", "type": ["float", "null"]},
        {"name": "rate_id", "type": ["int", "null"]},
        {"name": "datetime_start", "type": {"type": "long", "logicalType": "timestamp-millis"}},
        {"name": "datetime_end", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    ],
}

RATES_SCHEMA = {
    "doc": "Rates",
    "name": "Rates",
    "namespace": "homeanalytics",
    "type": "record",
    "fields": [
        {"name": "supplier_name", "type": ["string", "null"]},
        {"name": "rate_type", "type": ["string", "null"]},
        {"name": "start_time", "type": ["string", "null"]},
        {"name": "end_time", "type": ["string", "null"]},
        {"name": "cost", "type": ["float", "null"]},
        {"name": "standing_charge", "type": ["float", "null"]},
        {"name": "datetime_start", "type": {"type": "long", "logicalType": "timestamp-millis"}},
        {"name": "datetime_end", "type": ["null", {"type": "long", "logicalType": "timestamp-millis"}]},
    ],
}

SOLAR_SCHEMA = {
    "doc": "Solar",
    "name": "Solar",
    "namespace": "homeanalytics",
    "type": "record",
    "fields": [
        {"name": "datetime_start", "type": {"type": "long", "logicalType": "timestamp-millis"}},
        {"name": "datetime_end", "type": ["null", {"type": "long", "logicalType": "timestamp-millis"}]},
        {"name": "kwh_produced", "type": ["float", "null"]},
        {"name": "kwh_consumed", "type": ["float", "null"]},
        {"name": "kwh_exported", "type": ["float", "null"]},
        {"name": "kwh_imported", "type": ["float", "null"]},
        {"name": "kwh_battery_charge", "type": ["float", "null"]},
        {"name": "kwh_battery_discharge", "type": ["float", "null"]},
    ],
}


def get_usage_data(start_date: str = None, end_date: str = None):

    # default to the past week's data
    if not start_date and not end_date:
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    avro_data = []

    # add electricity data
    sql = f"""
        SELECT
            'Total' AS name,
            strftime('%s', datetime_start, 'localtime') * 1000 AS datetime_start,
            strftime('%s', datetime, 'localtime') * 1000 AS datetime_end,
            kwh AS kwh_consumed,
            granularity AS unit,
            "source" 
        FROM Electricity
        WHERE
            (date(datetime_start, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
            AND
            (date(datetime, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
    """
    usage = c.execute(sql).fetchall()

    for u in usage:
        u = dict(u)
        avro_data.append(u)

    # add entity data
    sql = f"""
        SELECT
            strftime('%s', datetime_start, 'localtime') * 1000 AS datetime_start,
            strftime('%s', datetime_end, 'localtime') * 1000 AS datetime_end,
            granularity AS unit,
            kwh_used AS kwh_consumed,
            energy_cost AS cost,
            e.entity_name AS name,
            e.entity_type AS category,
            e.entity_backend AS source
        FROM
            EntityUsage eu
        JOIN Entity e ON e.id = eu.entityId
        WHERE
            (date(datetime_start, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
            AND
            (date(datetime_end, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
    """
    usage = c.execute(sql).fetchall()

    for u in usage:
        u = dict(u)
        avro_data.append(u)

    # add heating
    sql = f"""
        SELECT
            strftime('%s', datetime, 'localtime') * 1000 AS datetime_start,
            strftime('%s', datetime, '23 hours', '59 minutes', '59 seconds', 'localtime') * 1000 AS datetime_end,
            kwh_consumed ,
            kwh_produced ,
            granularity AS unit,
            'Central Heating' AS name,
            'Heating' AS category
        FROM
            Heating h
        WHERE
            (date(datetime, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
        UNION ALL
        SELECT
            strftime('%s', datetime, 'localtime') * 1000 AS datetime_start,
            strftime('%s', datetime, '23 hours', '59 minutes', '59 seconds', 'localtime') * 1000 AS datetime_end,
            kwh_consumed ,
            kwh_produced ,
            granularity AS unit,
            'Hot Water' AS name,
            'Heating' AS category
        FROM
            HotWater hw
        WHERE
            (date(datetime, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
    """

    usage = c.execute(sql).fetchall()

    for u in usage:
        u = dict(u)
        avro_data.append(u)

    bq_table_id = f"home_analytics.usage_data"

    avro_file = f"./usage-export.avro"
    try:
        with open(avro_file, "wb") as out:
            avro_writer(out, USAGE_SCHEMA, avro_data)
    except Exception as e:
        raise Exception(f"Error converting to avro: {e}")

    with open(avro_file, "rb") as source_file:
        job_config = bigquery.job.LoadJobConfig()
        job_config.source_format = "AVRO"
        job_config.use_avro_logical_types = True
        job_config.time_partitioning = bigquery.TimePartitioning(
            field="datetime_start",
            type_=bigquery.TimePartitioningType.DAY,
        )
        job_config.write_disposition = bigquery.WriteDisposition.WRITE_APPEND

        job = bq_client.load_table_from_file(source_file, bq_table_id, job_config=job_config)
        job.result()
        print(f"Uploaded {source_file} to {bq_table_id}")

    try:
        print("removing avro file")
        os.remove(avro_file)
    except Exception as e:
        raise Exception(f"Error deleting avro file: {e}")


def get_rates_data():
    # This only needs to be run once to import your rates data to
    # bigquery. The rates table may need to be tweaked; see bigquery-view.sql
    # for more details
    sql = """
        SELECT
            s.supplier AS supplier_name,
            r.rate_type,
            CASE 
                WHEN r.start_time <> '' THEN r.start_time || ":00" 
                ELSE NULL
            END AS start_time,
            CASE
                WHEN r.end_time <> '' THEN r.end_time || ":00" 
                ELSE NULL
            END AS end_time,
            r.cost / 100 AS cost ,
            s.standing_charge ,
            CAST(s.supplier_start AS integer) AS datetime_start,
            CAST(s.supplier_end AS integer) AS datetime_end
        FROM
            Rates r
        JOIN Supplier s ON
            r.supplierId = s.id
    """

    rates = c.execute(sql).fetchall()
    rates_data = []
    for r in rates:
        r = dict(r)
        rates_data.append(r)
    print(rates_data)

    bq_table_id = f"home_analytics.rates"

    avro_file = f"./rates-export.avro"
    try:
        with open(avro_file, "wb") as out:
            avro_writer(out, RATES_SCHEMA, rates_data)
    except Exception as e:
        raise Exception(f"Error converting to avro: {e}")

    with open(avro_file, "rb") as source_file:
        job_config = bigquery.job.LoadJobConfig()
        job_config.source_format = "AVRO"
        job_config.use_avro_logical_types = True
        job_config.write_disposition = bigquery.WriteDisposition.WRITE_TRUNCATE

        job = bq_client.load_table_from_file(source_file, bq_table_id, job_config=job_config)
        job.result()  # Waits for job to complete
        print(f"Uploaded {source_file} to {bq_table_id}")

    try:
        print("removing avro file")
        os.remove(avro_file)
    except Exception as e:
        raise Exception(f"Error deleting avro file: {e}")


def get_solar_data(start_date: str = None, end_date: str = None):
    # default to the past week's data
    if not start_date and not end_date:
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    sql = f"""
        SELECT
            strftime('%s', datetime_start, 'localtime') * 1000 AS datetime_start,
            strftime('%s', datetime_end, 'localtime') * 1000 AS datetime_end,
            kwh_produced,
            kwh_consumed,
            kwh_imported,
            kwh_exported,
            kwh_battery_charge,
            kwh_battery_discharge
        FROM
            Solar r
        WHERE
            (date(datetime_start, 'localtime') BETWEEN '{start_date}' AND '{end_date}')
    """

    solar = c.execute(sql).fetchall()
    solar_data = []
    for s in solar:
        s = dict(s)
        solar_data.append(s)
    print(solar_data)

    bq_table_id = f"home_analytics.solar"

    avro_file = f"./solar-export.avro"
    try:
        with open(avro_file, "wb") as out:
            avro_writer(out, SOLAR_SCHEMA, solar_data)
    except Exception as e:
        raise Exception(f"Error converting to avro: {e}")

    with open(avro_file, "rb") as source_file:
        job_config = bigquery.job.LoadJobConfig()
        job_config.source_format = "AVRO"
        job_config.use_avro_logical_types = True
        job_config.write_disposition = bigquery.WriteDisposition.WRITE_TRUNCATE

        job = bq_client.load_table_from_file(source_file, bq_table_id, job_config=job_config)
        job.result()  # Waits for job to complete
        print(f"Uploaded {source_file} to {bq_table_id}")

    try:
        print("removing avro file")
        os.remove(avro_file)
    except Exception as e:
        raise Exception(f"Error deleting avro file: {e}")


if __name__ == "__main__":
    # get_rates_data()
    get_usage_data()
    get_solar_data()
