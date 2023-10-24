const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const mqtt = require("mqtt");
const { DateTime } = require("luxon");

dotenv.config();

const { MQTT_BROKER } = process.env;
const prisma = new PrismaClient();

async function getTopics() {
    try {
        const entities = await prisma.entity.findMany({
            where: {
                entity_backend: "tasmota_mqtt",
            },
            include: {
                credentials: true,
            },
        });

        const topics = {};
        entities.forEach((entity) => {
            const topic = entity.credentials.find((c) => c.key === "topic");
            if (topic) {
                topics[topic.value] = entity.id;
            }
        });

        return topics;
    } catch (error) {
        throw new Error("MQTT connection details not found in DB");
    }
}

async function insertMessage(topic, message) {
    const topics = await getTopics();
    if (!topics[topic]) {
        console.log("Skipping topic");
        return;
    }

    try {
        const jsonMsg = JSON.parse(message);
        if (jsonMsg.ENERGY) {
            const kwh_used = jsonMsg.ENERGY.Period / 1000;
            const dt_end = DateTime.fromISO(jsonMsg.Time).toUTC();
            const dt_start = dt_end.minus({ minutes: 5 });
            await prisma.entityUsage.create({
                data: {
                    entityId: topics[topic],
                    datetime_start: dt_start.toISO(),
                    datetime_end: dt_end.toISO(),
                    granularity: "5mins",
                    kwh_used,
                },
            });
        }
    } catch (error) {
        console.log("Invalid JSON message - skipping");
    }
}

async function main() {
    const client = mqtt.connect(MQTT_BROKER);

    client.on("connect", () => {
        client.subscribe("tele/#");
    });

    client.on("message", (topic, message) => {
        insertMessage(topic, message.toString()).catch((err) => {
            console.error("Error inserting:", err);
        });
    });
}

main().catch((e) => {
    console.error(e);
});
