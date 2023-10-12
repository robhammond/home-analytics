const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { DateTime } = require('luxon');
require('dotenv').config();

const { updateImport, updateExport } = require('./update-rates');

const prisma = new PrismaClient();

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
                entity: {
                    entity_name: 'n3rgy',
                },
            },
        });
        authHeader = res.value;
    } catch (error) {
        throw new Error(`Authorization header not found in DB: ${error}`);
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
            const ts = value.timestamp + 'Z';
            const dt = DateTime.fromSQL(ts).toJSDate();
            const dtStart = DateTime.fromSQL(ts).minus({ minutes: 30 }).toJSDate();

            try {
                let insertedData = await prisma.electricity.create({
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

    updateImport();
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
                entity: {
                    entity_name: 'n3rgy',
                },
            },
        });
        authHeader = res.value;
    } catch (error) {
        throw new Error(`Authorization header not found in DB: ${error}`);
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
            const ts = value.timestamp + 'Z';
            const dt = DateTime.fromSQL(ts).toJSDate();
            const dtStart = DateTime.fromSQL(ts).minus({ minutes: 30 }).toJSDate();
            let rowId;
            try {
                rowId = await prisma.electricity.findFirst({
                    where: {
                        datetime: dt,
                        granularity: data.granularity,
                    },
                    select: {
                        id: true,
                    }
                });
            } catch (e) {
                console.error(`Error finding: ${e}`);
            }
            try {
                let updatedRow = await prisma.electricity.update({
                    where: {
                        id: rowId.id
                    },
                    data: {
                        kwh_exported: value.value,
                    },
                });
                console.log(updatedRow);
            } catch (error) {
                console.error(`Error updating: ${error}`);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        // await prisma.$disconnect();
    }

    updateExport();
};


fetchUsage();
fetchProduction();
