const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    try {
        let setupStatus = { tariff: false, consumption: false, vehicle: false };
        const supplierSetup = await prisma.supplier.findFirst();
        const ratesSetup = await prisma.rates.findFirst();
        const dataSourceSetup = await prisma.$queryRaw`
            SELECT
                LOWER(entity_name) AS entity_name,
                entity_type,
                key,
                value
            FROM Credentials c
            JOIN Entity e ON
                e.id = c.entityId
            WHERE 
                entity_type = "Consumption Data Source"
                OR
                entity_name IN ("n3rgy", "Octopus Energy")
        `;
        let octopus = true;
        let octopusCreds = [];
        let n3rgy = true;
        for (let row of dataSourceSetup) {
            if (row["entity_name"] == 'n3rgy' && row["value"] == "12345") {
                n3rgy = false;
            }
            if (row["entity_name"] == 'octopus energy') {
                octopusCreds.push(row["value"]);
            }
        }
        if (octopusCreds.includes("12345")) {
            octopus = false;
        }
        if (n3rgy || octopus) {
            setupStatus["consumption"] = true;
        }
        if (supplierSetup && ratesSetup) {
            setupStatus["tariff"] = true;
        }
        if (!setupStatus["tariff"] || !setupStatus["consumption"]) {
            res.redirect(`/onboarding?tariff=${setupStatus["tariff"]}&consumption=${setupStatus["consumption"]}`);
        }
    } catch (err) {
        console.log(err);
    }

    res.render("index", {
        page_title: "Home",
        dates: res.locals.dateShortcuts,
    });
});

router.get("/onboarding", async (req, res) => {
    res.render("onboarding", { page_title: "Setup", params: req.query });
});

module.exports = router;
