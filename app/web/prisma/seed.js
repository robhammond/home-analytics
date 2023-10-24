const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    const n3rgy = await prisma.Api.create({
        data: {
            name: "n3rgy",
            type: "energy_usage",
        },
    });

    const n3rgyCred = await prisma.ApiCredentials.create({
        data: {
            api_id: n3rgy.id,
            key: "auth_header",
            value: "12345",
        },
    });

    const octopus = await prisma.Api.create({
        data: {
            name: "Octopus Energy",
            type: "energy_usage",
        },
    });

    const octopusMpan = await prisma.ApiCredentials.create({
        data: { api_id: octopus.id, key: "mpan", value: "12345" },
    });

    const octopusSerial = await prisma.ApiCredentials.create({
        data: { api_id: octopus.id, key: "serial_number", value: "12345" },
    });

    const octopusKey = await prisma.ApiCredentials.create({
        data: { api_id: octopus.id, key: "api_key", value: "12345" },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
