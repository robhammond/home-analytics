const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const n3rgy = await prisma.entity.create({
        data: {
            entity_name: "n3rgy",
            entity_type: "API",
        },
    });
    
    const n3rgyCred = await prisma.credentials.create({
        data: {
            entityId: n3rgy.id,
            key: "auth_header",
            value: "12345",
        },
    });

    // console.log({ n3rgy, n3rgyCred });
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
