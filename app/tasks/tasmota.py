import sqlite3
import pytz
import json
from datetime import datetime, timedelta
import asyncio
from contextlib import AsyncExitStack, asynccontextmanager
from asyncio_mqtt import Client, MqttError
from dotenv import load_dotenv
import os

load_dotenv()


HA_DB_URL = os.getenv("HA_DB_URL")
MQTT_BROKER = os.getenv("MQTT_BROKER")

conn = sqlite3.connect(HA_DB_URL)
c = conn.cursor()


def get_topics():
    sql = """
        SELECT
            e.id,
            value
        FROM Credentials c
        JOIN Entity e ON
            e.id = c.entityId
        WHERE
            e.entity_backend = 'tasmota_mqtt'
            AND key = 'topic'
    """

    topics = {}
    try:
        res = c.execute(sql).fetchall()
        for r in res:
            topics[r[1]] = r[0]
    except Exception as e:
        raise Exception("MQTT connection details not found in DB")

    return topics

async def advanced_example():

    topics = get_topics()
    async with AsyncExitStack() as stack:
        # Keep track of the asyncio tasks that we create, so that
        # we can cancel them on exit
        tasks = set()
        stack.push_async_callback(cancel_tasks, tasks)

        # Connect to the MQTT broker
        client = Client(MQTT_BROKER)
        await stack.enter_async_context(client)

        # Messages that doesn't match a filter will get logged here
        messages = await stack.enter_async_context(client.unfiltered_messages())
        task = asyncio.create_task(insert_message(messages))
        tasks.add(task)

        # Subscribe to topic(s)
        # 🤔 Note that we subscribe *after* starting the message
        # loggers. Otherwise, we may miss retained messages.
        await client.subscribe("tele/#")

        # Wait for everything to complete (or fail due to, e.g., network
        # errors)
        await asyncio.gather(*tasks)


async def log_messages(messages, template):
    async for message in messages:
        print(template.format(message.payload.decode()))

async def insert_message(messages):
    async for message in messages:
        msg = message.payload.decode()
        print(message.topic)
        try:
            topic = message.topic
            topics = get_topics()
            if topic not in topics:
                print("skipping topic")
                continue
            else:
                print(f"topic id: {topics[topic]}")

            json_data = json.loads(msg)
            if 'ENERGY' in json_data:
                # Period = Wh, so divide by 1,000
                kwh_used = int(json_data["ENERGY"]["Period"]) / 1000

                dt_end = datetime.strptime(json_data["Time"], "%Y-%m-%dT%H:%M:%S")
                dt_end = dt_end.astimezone(pytz.utc)
                dt_start = dt_end - timedelta(minutes=5)
                dt_end = datetime.strftime(dt_end, "%Y-%m-%dT%H:%M:%SZ")
                dt_start = datetime.strftime(dt_start, "%Y-%m-%dT%H:%M:%SZ")

                sql = f"""
                    INSERT INTO EntityUsage
                    (
                        entityId,
                        datetime_start,
                        datetime_end,
                        granularity,
                        kwh_used
                    )
                    VALUES (
                        {topics[topic]},
                        '{dt_start}',
                        '{dt_end}',
                        '5mins',
                        {kwh_used}
                    )
                """
                try:
                    c.execute(sql)
                    conn.commit()
                except Exception as e:
                    print(f"Error inserting: {e}")
                    pass
        except Exception as e:
            print("Invalid JSON message - skipping")
            pass


async def cancel_tasks(tasks):
    for task in tasks:
        if task.done():
            continue
        try:
            task.cancel()
            await task
        except asyncio.CancelledError:
            pass


async def main():
    # Run the advanced_example indefinitely. Reconnect automatically
    # if the connection is lost.
    reconnect_interval = 3  # [seconds]
    while True:
        try:
            await advanced_example()
        except MqttError as error:
            print(f'Error "{error}". Reconnecting in {reconnect_interval} seconds.')
        finally:
            await asyncio.sleep(reconnect_interval)


asyncio.run(main())
