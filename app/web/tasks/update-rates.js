const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { DateTime } = require('luxon');
require('dotenv').config();

const prisma = new PrismaClient();
const HA_DB_URL = process.env.HA_DB_URL;

const updateImport = async () => {
    try {
        // Fetch records where rateId is null
        const usageRecords = await prisma.electricity.findMany({
            where: {
                rateId: null,
            },
        });

        for (const record of usageRecords) {
            // Your logic for updating the rateId
            // For example, if you compute rateId based on datetime, you can do:
            const rateId = computeRateId(record.datetime); // Implement this function

            await prisma.electricity.update({
                where: {
                    id: record.id,
                },
                data: {
                    rateId: rateId,
                },
            });
        }
    } catch (error) {
        console.error(`Error updating rates: ${error}`);
    } finally {
        await prisma.$disconnect();
    }
};

const computeRateId = (datetime, supplierId) => {
    const dt = DateTime.fromJSDate(datetime);
    const time = dt.toFormat('HH:mm');

    // Filter rates by supplierId
    const supplierRates = rates.filter(rate => rate.supplierId === supplierId);

    for (const rate of supplierRates) {
        if (rate.rate_type === 'fixed') {
            return rate.id;
        }

        if (rate.rate_type === 'off-peak' || rate.rate_type === 'peak') {
            const startTime = DateTime.fromFormat(rate.start_time, 'HH:mm');
            const endTime = DateTime.fromFormat(rate.end_time, 'HH:mm');
            const currentTime = DateTime.fromFormat(time, 'HH:mm');

            // Check if the current time is within the rate time range
            if (currentTime >= startTime && currentTime < endTime) {
                return rate.id;
            }
        }
    }

    return null; // Return null if no rateId is found
};


const updateExport = async () => {
    try {
        // Fetch records where rateId for export might be null or needs updating
        const exportRecords = await prisma.electricity.findMany({
            where: {
                rateId: null,  // Replace this condition based on your specific needs
            },
        });

        for (const record of exportRecords) {
            // Your logic for updating the rateId for export
            // For example, if you compute rateId based on datetime, you can do:
            const rateId = computeRateId(record.datetime); // Implement this function

            await prisma.electricity.update({
                where: {
                    id: record.id,
                },
                data: {
                    rateId: rateId,  // Update rateId or any other field as needed
                },
            });
        }
    } catch (error) {
        console.error(`Error updating export rates: ${error}`);
    } finally {
        await prisma.$disconnect();
    }
};
