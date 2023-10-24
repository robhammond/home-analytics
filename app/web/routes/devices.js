const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const dates = res.locals.dateShortcuts;
    const devices = await prisma.entity.findMany({
        where: {
            entity_backend: "tasmota_mqtt",
        },
    });

    res.render("devices", { page_title: "Devices", devices, dates });
});

module.exports = router;
