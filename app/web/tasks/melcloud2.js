const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const moment = require("moment");

const prisma = new PrismaClient();

const daterange = (start, end) => {
    const startDate = moment(start);
    const endDate = moment(end);
    const dates = [];
    while (startDate.isBefore(endDate)) {
        dates.push(startDate.format("YYYY-MM-DD"));
        startDate.add(1, "day");
    }
    return dates;
};

const heatNow = async () => {
    const endpoint_url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Device/SetAtw";

    const creds = await prisma.credentials.findMany({
        where: {
            entity: {
                entityName: {
                    equals: "ecodan",
                    mode: "insensitive",
                },
            },
        },
        select: {
            key: true,
            value: true,
        },
    });

    const credentials = {};
    creds.forEach((cred) => {
        credentials[cred.key.toLowerCase()] = cred.value;
    });

    if (!credentials.device_id || !credentials.mitsi_context_key) {
        throw new Error("Missing credentials in database");
    }

    const headers = {
        // Add your headers here
    };

    const json_payload = {
        DeviceID: credentials.device_id,
        DeviceType: 1,
        ForcedHotWaterMode: "true",
        SetTankWaterTemperature: 45,
        EffectiveFlags: 87534,
    };

    const res = await axios.post(endpoint_url, json_payload, { headers });
    if (res.status === 200) {
        console.log("Heat now request sent");
    } else {
        console.log("Heat now request failed", res.status);
    }
};

const fetchUsage = async (start_date, end_date) => {
    // Your code logic here
};

(async () => {
    await heatNow();
})();
