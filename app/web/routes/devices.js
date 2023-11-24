const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const dates = res.locals.dateShortcuts;
    try {
        const devices = await prisma.entity.findMany({
            where: {
                backend: "tasmota_mqtt",
            },
        });

        res.render("devices", { page_title: "Devices", devices, dates });
    } catch (error) {
        res.status(500).send("Error getting devices");
    }
});

module.exports = router;
