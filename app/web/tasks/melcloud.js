const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const moment = require("moment");
const rrule = require("rrule").RRule;

const prisma = new PrismaClient();

const getHours = (startDate) => {
    const start = moment(startDate).toDate();
    return rrule.rrule({
        freq: rrule.HOURLY,
        count: 24,
        dtstart: start,
    }).all().map((dt) => moment(dt).utc().format());
};

const fetchUsage = async (numDays = 1) => {
    const d1start = moment().subtract(numDays, "days");
    const d1end = moment().subtract(numDays - 1, "days");
    const start_date = d1start.format("YYYY-MM-DDT00:00:00");
    const end_date = d1end.format("YYYY-MM-DDT00:00:00");

    const endpoint_url = "https://app.melcloud.com/Mitsubishi.Wifi.Client/Report/GetTemperatureLog2";

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

    if (!credentials.device_id || !credentials.mitsi_context_key || !credentials.location) {
        throw new Error("Missing credentials in database");
    }

    const json_payload = {
        DeviceId: credentials.device_id,
        Duration: 1,
        Location: credentials.location,
        FromDate: start_date,
        ToDate: end_date,
    };

    const headers = {
        // Add your headers here
    };

    const res = await axios.post(endpoint_url, json_payload, { headers });

    if (res.status === 200) {
        const hp_data = res.data;
        const data_rows = hp_data.Data;

        for (const [i, dthour] of getHours(start_date).entries()) {
            const row = {
                datetime: dthour,
                setTemperature: data_rows[0][i],
                insideTemperature: data_rows[1][i],
                outsideTemperature: data_rows[2][i],
                tankTemperature: data_rows[3][i],
            };

            await prisma.temperature.create({
                data: {
                    datetime: new Date(row.datetime),
                    setTemperature: row.setTemperature,
                    insideTemperature: row.insideTemperature,
                    outsideTemperature: row.outsideTemperature,
                    tankTemperature: row.tankTemperature,
                },
            });
        }
    } else {
        throw new Error(`Error code ${res.status} fetching feed`);
    }
};

(async () => {
    await fetchUsage();
})();
