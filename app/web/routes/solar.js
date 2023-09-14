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

    res.render("solar", { 
        page_title: "Solar",
        unit: unit,
        start: start,
        end: end,
        filter: filter,
    });
});

module.exports = router;