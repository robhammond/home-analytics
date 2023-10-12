const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const moment = require('moment-timezone');

const prisma = new PrismaClient();
const HA_DB_URL = process.env.HA_DB_URL;

const fetchRenaultData = async () => {
    const creds = await prisma.credentials.findMany({
        where: { entity: { entityName: { equals: 'renault', mode: 'insensitive' } } },
        select: { key: true, value: true },
    });

    const credentials = {};
    creds.forEach(cred => {
        credentials[cred.key] = cred.value;
    });

    const cars = await prisma.car.findMany({
        where: { make: { equals: 'renault', mode: 'insensitive' } },
        select: { id: true, vin: true },
    });

    credentials.cars = cars;

    // Use Axios to login and get data from Renault API
    // Since Renault API is not provided, this is a placeholder.
    // Add appropriate Axios code to interact with Renault's API.

    for (const car of credentials.cars) {
        const data = {}; // Replace with actual data fetched from Renault API

        // Add your logic to populate 'data' from the API response
        // ...

        const dt_checked = moment(data.timestamp).utc();
        const last_updated = dt_checked.format('YYYY-MM-DDTHH:mm:ss[Z]');

        data.datetime = last_updated;

        try {
            await prisma.carStatus.create({
                data: {
                    carId: car.id,
                    datetime: new Date(data.datetime),
                    odometer: data.odometer,
                    odometerUnit: data.odometerUnit,
                    batteryPercent: data.batteryPercent,
                    estimatedRange: data.estimatedRange,
                    rangeUnit: data.rangeUnit,
                    chargingStatus: data.chargingStatus,
                },
            });
        } catch (e) {
            console.error(`Error inserting: ${e}`);
        }
    }
};

(async () => {
    await fetchRenaultData();
})();
