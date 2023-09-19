const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { DateTime } = require('luxon');
require('dotenv').config();

const prisma = new PrismaClient();
const HA_DB_URL = process.env.HA_DB_URL;

const fetchUsage = async (startDate, endDate) => {
    if (!startDate) {
        startDate = DateTime.now().minus({ days: 7 }).toFormat('yyyyMMdd');
    }
    if (!endDate) {
        endDate = DateTime.now().plus({ days: 1 }).toFormat('yyyyMMdd');
    }

    const endpointUrl = 'https://consumer-api.data.n3rgy.com/electricity/consumption/1';
    const params = {
        start: startDate,
        end: endDate,
        output: 'json',
    };

    let authHeader;

    try {
        const res = await prisma.credentials.findFirst({
            where: {
                key: 'auth_header',
                Entity: {
                    entity_name: 'n3rgy',
                },
            },
            select: {
                value: true,
            },
        });
        authHeader = res.value;
    } catch (error) {
        throw new Error('Authorization header not found in DB');
    }

    if (authHeader === '12345') {
        throw new Error('Please define the n3rgy Authorization header - see README.md for more information');
    }

    try {
        const { data } = await axios.get(endpointUrl, {
            params,
            headers: {
                Authorization: authHeader,
            },
        });

        for (const value of data.values) {
            const ts = value.timestamp;
            const dt = DateTime.fromISO(ts).toJSDate();
            const dtStart = DateTime.fromISO(ts).minus({ minutes: 30 }).toJSDate();

            try {
                await prisma.electricity.create({
                    data: {
                        datetime: dt,
                        datetime_start: dtStart,
                        kwh: value.value,
                        granularity: data.granularity,
                        source: 'n3rgy',
                    },
                });
            } catch (error) {
                console.error(`Error inserting: ${error}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }

    // Call to update_import() equivalent function if needed
};



const fetchProduction = async (startDate, endDate) => {
    if (!startDate) {
        startDate = DateTime.now().minus({ days: 7 }).toFormat('yyyyMMdd');
    }
    if (!endDate) {
        endDate = DateTime.now().plus({ days: 1 }).toFormat('yyyyMMdd');
    }

    const endpointUrl = 'https://consumer-api.data.n3rgy.com/electricity/production/1';
    const params = {
        start: startDate,
        end: endDate,
        output: 'json',
    };

    let authHeader;

    try {
        const res = await prisma.credentials.findFirst({
            where: {
                key: 'auth_header',
                Entity: {
                    entity_name: 'n3rgy',
                },
            },
            select: {
                value: true,
            },
        });
        authHeader = res.value;
    } catch (error) {
        throw new Error('Authorization header not found in DB');
    }

    if (authHeader === '12345') {
        throw new Error('Please define the n3rgy Authorization header - see README.md for more information');
    }

    try {
        const { data } = await axios.get(endpointUrl, {
            params,
            headers: {
                Authorization: authHeader,
            },
        });

        for (const value of data.values) {
            const ts = value.timestamp;
            const dt = DateTime.fromISO(ts).toJSDate();
            const dtStart = DateTime.fromISO(ts).minus({ minutes: 30 }).toJSDate();

            try {
                await prisma.electricity.updateMany({
                    where: {
                        datetime: dt,
                        datetime_start: dtStart,
                        granularity: data.granularity,
                        source: 'n3rgy',
                    },
                    data: {
                        kwh_exported: value.value,
                    },
                });
            } catch (error) {
                console.error(`Error updating: ${error}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }

    // Call to update_export() equivalent function if needed
};





fetchUsage();
fetchProduction();