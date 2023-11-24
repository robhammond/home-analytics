const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    try {
        const setupStatus = { tariff: false, energy_usage: false, vehicle: false };
        const supplierSetup = await prisma.energySupplier.findFirst();
        const ratesSetup = await prisma.energyRate.findFirst();
        const octopus_setup = await prisma.apiCredentials.findMany({
            select: {
                api: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
                key: true,
                value: true,
            },
            where: {
                api: {
                    type: "energy_usage",
                    name: "Octopus Energy",
                },
            },
        });

        const n3rgy_setup = await prisma.apiCredentials.findFirst({
            select: {
                api: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
                key: true,
                value: true,
            },
            where: {
                api: {
                    type: "energy_usage",
                    name: "n3rgy",
                },
            },
        });

        let n3rgy = true;
        let octopus = true;

        if (n3rgy_setup.value === "12345") {
            n3rgy = false;
        }
        for (const row of octopus_setup) {
            if (row.value === "12345") {
                octopus = false;
            }
        }

        if (n3rgy || octopus) {
            setupStatus.energy_usage = true;
        }
        if (supplierSetup && ratesSetup) {
            setupStatus.tariff = true;
        }
        if (!setupStatus.tariff || !setupStatus.energy_usage) {
            res.redirect(`/onboarding?tariff=${setupStatus.tariff}&energy_usage=${setupStatus.energy_usage}`);
        }
    } catch (err) {
        console.error(err);
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
