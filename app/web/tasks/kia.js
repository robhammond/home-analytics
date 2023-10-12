const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BlueLinky = require('bluelinky');


const updateVehicleDetails = async () => {
    try {
        const creds = await prisma.credential.findMany({
            where: {
                entity: {
                    entity_name: {
                        equals: 'kia',
                        mode: 'insensitive',
                    },
                },
            },
            select: {
                key: true,
                value: true,
            },
        });

        const credentials = creds.reduce((acc, cur) => {
            acc[cur.key] = cur.value;
            return acc;
        }, {});

        const cars = await prisma.car.findMany({
            where: {
                make: {
                    equals: 'kia',
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                vin: true,
                model: true,
            },
        });

        credentials.cars = cars;

        const vm = new VehicleManager({
            region: 1,
            brand: 1,
            username: credentials.username,
            password: credentials.password,
            pin: '',
        });

        const client = new BlueLinky({
            username: credentials.username,
            password: credentials.password,
            brand: credentials.brand || 'kia',
            region: credentials.region || 'EU',
            pin: credentials.pin || ''
        });

        client.on('ready', async () => {
            const vehicle = client.getVehicle('5NMS55555555555555');
            try {
                const response = await vehicle.odometer();
                console.log(response);
            } catch (err) {
                // log the error from the command invocation 
            }
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
};

updateVehicleDetails();
