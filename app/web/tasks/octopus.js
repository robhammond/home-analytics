const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const moment = require('moment-timezone');

const prisma = new PrismaClient();
const HA_DB_URL = process.env.HA_DB_URL;
const API_ROOT = "https://api.octopus.energy";

const getUserDetails = async () => {
    const creds = await prisma.credentials.findMany({
        where: {
            entity: {
                entityName: {
                    equals: 'octopus energy',
                    mode: 'insensitive'
                }
            }
        },
        select: {
            key: true,
            value: true
        }
    });

    const credentials = {};

    for (const cred of creds) {
        if (cred.key.toLowerCase() === 'mpan' && cred.value !== '12345') {
            credentials.mpan = cred.value;
        }
        if (cred.key.toLowerCase() === 'serial_number' && cred.value !== '12345') {
            credentials.serial_number = cred.value;
        }
        if (cred.key.toLowerCase() === 'api_key' && cred.value !== '12345') {
            credentials.api_key = cred.value;
        }
    }

    return credentials;
};

const fetchUsage = async (startDate, endDate) => {
    if (!startDate) {
        startDate = moment().subtract(2, 'days').startOf('day').format();
    }

    if (!endDate) {
        endDate = moment().add(1, 'day').startOf('day').format();
    }

    const creds = await getUserDetails();

    const requestUrl = `${API_ROOT}/v1/electricity-meter-points/${creds.mpan}/meters/${creds.serial_number}/consumption/`;
    const params = {
        period_from: startDate,
        period_to: endDate
    };
    const headers = {
        'Authorization': 'Basic ' + Buffer.from(creds.api_key + ':').toString('base64')
    };

    try {
        const res = await axios.get(requestUrl, { params, headers });

        if (res.status === 200) {
            const results = res.data.results;

            for (const result of results) {
                const tmpStart = moment.tz(result.interval_start, 'UTC');
                const tmpEnd = moment.tz(result.interval_end, 'UTC');

                const dtStart = tmpStart.format('YYYY-MM-DD HH:mm:ss');
                const dtEnd = tmpEnd.format('YYYY-MM-DD HH:mm:ss');

                try {
                    await prisma.electricity.create({
                        data: {
                            datetime: new Date(dtEnd),
                            datetime_start: new Date(dtStart),
                            kwh: result.consumption,
                            granularity: 'halfhour',
                            source: 'octopus'
                        }
                    });
                } catch (e) {
                    console.error(`Error inserting: ${e}`);
                }
            }
        } else {
            console.error(`Error fetching: ${res.status}`);
        }
    } catch (e) {
        console.error(e);
    }
};

(async () => {
    await fetchUsage();
})();
