const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { DateTime } = require("luxon");

const prisma = new PrismaClient();
const API_ROOT = "https://api.octopus.energy";

const getUserDetails = async () => {
    const creds = await prisma.apiCredentials.findMany({
        where: {
            api: {
                name: "Octopus Energy",
            },
        },
        select: {
            key: true,
            value: true,
        },
    });

    const credentials = {};

    for (const cred of creds) {
        if (cred.key.toLowerCase() === "mpan" && cred.value !== "12345") {
            credentials.mpan = cred.value;
        }
        if (cred.key.toLowerCase() === "serial_number" && cred.value !== "12345") {
            credentials.serial_number = cred.value;
        }
        if (cred.key.toLowerCase() === "api_key" && cred.value !== "12345") {
            credentials.api_key = cred.value;
        }
    }

    return credentials;
};

const fetchUsage = async (startDate, endDate) => {
    let start_date = startDate;
    let end_date = endDate;
    if (!start_date) {
        start_date = DateTime.now().minus({ days: 2 }).startOf("day").toISO();
    }

    if (!end_date) {
        end_date = DateTime.now().plus({ days: 1 }).startOf("day").toISO();
    }

    const creds = await getUserDetails();

    const requestUrl = `${API_ROOT}/v1/electricity-meter-points/${creds.mpan}/meters/${creds.serial_number}/consumption/`;
    const params = {
        period_from: start_date,
        period_to: end_date,
    };
    const auth = {
        username: creds.api_key,
        password: "",
    };

    const res = await axios.get(requestUrl, {
        auth,
        params,
    });

    if (res.status === 200) {
        const { results } = res.data;

        for (const result of results) {
            const tmpStart = DateTime.fromISO(result.interval_start, { zone: "utc" });
            const tmpEnd = DateTime.fromISO(result.interval_end, { zone: "utc" });

            const dtStart = tmpStart.format("YYYY-MM-DD HH:mm:ss");
            const dtEnd = tmpEnd.format("YYYY-MM-DD HH:mm:ss");

            try {
                await prisma.gridEnergy.create({
                    data: {
                        datetime_start: new Date(dtStart),
                        datetime_end: new Date(dtEnd),
                        kwh_imported: result.consumption,
                        granularity: "halfhour",
                        source: "octopus",
                    },
                });
            } catch (e) {
                console.error(`Error inserting: ${e}`);
            }
        }
    } else {
        console.error(`Error fetching: ${res.status}`);
    }
};

(async () => {
    await fetchUsage();
})();
