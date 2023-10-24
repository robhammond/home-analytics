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
    const entityTypes = await prisma.$queryRaw`
        SELECT 
            DISTINCT entity_type
        FROM
            Entity
    `;

    res.render("energy", {
        page_title: "Energy",
        unit,
        start,
        end,
        filter,
        entityTypes,
    });
});

router.get("/insights", async (req, res) => {
    const unit = req.query.unit || "day";
    const start = req.query.start || DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
    const end = req.query.end || DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    const filter = req.query.filter || "all";

    res.render("energy/insights", {
        page_title: "Energy Insights",
        unit,
        start,
        end,
        filter,
    });
});

module.exports = router;
