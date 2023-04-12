const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const dates = res.locals.dateShortcuts;
    const devices = await prisma.$queryRaw`
        SELECT
            *
        FROM Entity e
        WHERE
            e.entity_backend = 'tasmota_mqtt'
    `;

    res.render("devices", { page_title: "Devices", devices, dates: dates, });
});


module.exports = router;
