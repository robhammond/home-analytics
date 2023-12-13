const express = require("express");
const { DateTime } = require("luxon");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const unit = req.query.unit || "day";
    const start = req.query.start || DateTime.now().minus({ days: 30 }).toFormat("yyyy-MM-dd");
    const end = req.query.end || DateTime.now().toFormat("yyyy-MM-dd");
    const filter = req.query.filter || "all";

    res.render("solar", {
        title: "Solar",
        unit,
        start,
        end,
        filter,
    });
});

module.exports = router;
