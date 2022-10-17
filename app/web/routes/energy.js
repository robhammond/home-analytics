const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    let unit = req.query.unit || 'day';
    let start = req.query.start || DateTime.now().minus({days: 30}).toFormat("yyyy-MM-dd");;
    let end = req.query.end || DateTime.now().toFormat("yyyy-MM-dd");;
    let filter = req.query.filter || 'all';
    let entityTypes = await prisma.$queryRaw`
        SELECT 
            DISTINCT entity_type
        FROM
            Entity
    `;

    res.render("energy", { 
        page_title: "Energy",
        unit: unit,
        start: start,
        end: end,
        filter: filter,
        entityTypes: entityTypes,
    });
});

router.get("/insights", async (req, res) => {
    let unit = req.query.unit || 'day';
    let start = req.query.start || DateTime.now().minus({days: 31}).toFormat("yyyy-MM-dd");;
    let end = req.query.end || DateTime.now().minus({days: 1}).toFormat("yyyy-MM-dd");;
    let filter = req.query.filter || 'all';

    res.render("energy/insights", { 
        page_title: "Energy Insights",
        unit: unit,
        start: start,
        end: end,
        filter: filter,
    });
});


module.exports = router;