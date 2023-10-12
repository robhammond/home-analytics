const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const moment = require('moment-timezone');

const prisma = new PrismaClient();
const HA_DB_URL = process.env.HA_DB_URL;
const API_BASE = "api.pod-point.com";
const API_VERSION = "v4";
const API_BASE_URL = `https://${API_BASE}/${API_VERSION}`;
const HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Language": "en",
    "User-Agent": "Pod Point Native Mobile App"
};

const getUserPass = async () => {
    const creds = await prisma.credentials.findMany({
        where: {
            entity: {
                entityName: {
                    equals: 'pod point',
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
        if (cred.key === 'username') {
            credentials.username = cred.value;
        }
        if (cred.key === 'password') {
            credentials.password = cred.value;
        }
    }

    return credentials;
};

const getAccessToken = async () => {
    const creds = await getUserPass();
    const payload = {
        username: creds.username,
        password: creds.password
    };

    const res = await axios.post(`${API_BASE_URL}/auth`, payload, { headers: HEADERS });

    if (res.status === 200) {
        return `Bearer ${res.data.access_token}`;
    } else {
        throw new Error(`Error getting Access Token: ${res.status}`);
    }
};

const getChargeSessions = async (startDate, endDate) => {
    const authString = await getAccessToken();
    HEADERS.Authorization = authString;

    // Format dates using moment.js
    if (!startDate) {
        startDate = moment().startOf('month').format();
    }
    if (!endDate) {
        endDate = moment().endOf('month').format();
    }

    const params = {
        perpage: 'all',
        type: 'all',
        from: startDate,
        to: endDate,
        view: 'month'
    };

    const res = await axios.get(`${API_BASE_URL}/users/{USER_ID}/charges`, { params, headers: HEADERS });

    if (res.status === 200) {
        const charges = res.data.charges;

        for (const charge of charges) {
            if (!charge.ends_at || !charge.location.home) continue;

            const session = {};
            session.charging_duration = charge.charging_duration.raw || 0;
            session.datetime_start = moment.tz(charge.starts_at, 'UTC').format('YYYY-MM-DDTHH:mm:ssZ');
            session.datetime_end = moment.tz(charge.ends_at, 'UTC').format('YYYY-MM-DDTHH:mm:ssZ');
            session.kwh_used = charge.kwh_used;
            session.energy_cost = charge.energy_cost ? charge.energy_cost / 100 : null;

            await prisma.entityUsage.create({
                data: {
                    datetime_start: new Date(session.datetime_start),
                    datetime_end: new Date(session.datetime_end),
                    duration_seconds: session.charging_duration,
                    entityId: { USER_ENTITY_ID },
                    granularity: 'day',
                    kwh_used: session.kwh_used,
                    energy_cost: session.energy_cost
                }
            });
        }
    } else {
        throw new Error(`Error getting charges, status code ${res.status}`);
    }
};

(async () => {
    await getChargeSessions();
})();
