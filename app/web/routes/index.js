const express = require("express");
const router = express.Router();
const { dateShortcuts } = require("../globals");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    try {
        let setupStatus = { tariff: false, n3rgy: false, vehicle: false };
        const supplierSetup = await prisma.supplier.findFirst();
        const ratesSetup = await prisma.rates.findFirst();
        const n3rgySetup = await prisma.$queryRaw`
            SELECT 
                value 
            FROM Credentials c
            JOIN Entity e ON
                e.id = c.entityId
            WHERE key = 'auth_header' 
                AND e.entity_name = 'n3rgy'
        `;
        if (n3rgySetup[0]["value"] != "12345") {
            setupStatus["n3rgy"] = true;
        }
        if (supplierSetup && ratesSetup) {
            setupStatus["tariff"] = true;
        }
        if (!setupStatus["tariff"] || !setupStatus["n3rgy"]) {
            res.redirect(`/onboarding?tariff=${setupStatus["tariff"]}&n3rgy=${setupStatus["n3rgy"]}`);
        }
    } catch (err) {
        console.log(err);
    }

    res.render("index", {
        page_title: "Home",
        dates: dateShortcuts,
    });
});

router.get("/onboarding", async (req, res) => {
    res.render("onboarding", { page_title: "Setup", params: req.query });
});

module.exports = router;
