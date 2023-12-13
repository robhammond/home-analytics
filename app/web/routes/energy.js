const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const unit = req.query.unit || "day";
    const start = req.query.start || DateTime.now().minus({ days: 30 }).toFormat("yyyy-MM-dd");
    const end = req.query.end || DateTime.now().toFormat("yyyy-MM-dd");
    const filter = req.query.filter || "all";
    try {
        const entityTypes = await prisma.$queryRaw`
            SELECT 
                DISTINCT type
            FROM
                entities
        `;

        res.render("energy", {
            title: "Energy",
            unit,
            start,
            end,
            filter,
            entityTypes,
        });
    } catch (error) {
        res.status(500).send("Error getting entity details");
    }
});

router.get("/insights", async (req, res) => {
    const unit = req.query.unit || "day";
    const start = req.query.start || DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
    const end = req.query.end || DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    const filter = req.query.filter || "all";

    res.render("energy/insights", {
        title: "Energy Insights",
        unit,
        start,
        end,
        filter,
    });
});

module.exports = router;
