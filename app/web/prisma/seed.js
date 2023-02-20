const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const n3rgy = await prisma.entity.create({
        data: {
            entity_name: "n3rgy",
            entity_type: "Consumption Data Source",
            entity_backend: "api",
        },
    });
    
    const n3rgyCred = await prisma.credentials.create({
        data: {
            entityId: n3rgy.id,
            key: "auth_header",
            value: "12345",
        },
    });
    
    const octopus = await prisma.entity.create({
        data: {
            entity_name: "Octopus Energy",
            entity_type: "Consumption Data Source",
            entity_backend: "api",
        },
    });
    
    const octopusMpan = await prisma.credentials.create({
        data: { entityId: octopus.id, key: "mpan", value: "12345" },
    });

    const octopusSerial = await prisma.credentials.create({
        data: { entityId: octopus.id, key: "serial_number", value: "12345" },
    });
    
    const octopusKey = await prisma.credentials.create({
        data: { entityId: octopus.id, key: "api_key", value: "12345" },
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
