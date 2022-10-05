const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const today_date = DateTime.now().toFormat("yyyy-MM-dd");
    const yday_date = DateTime.now().minus({days: 1}).toFormat("yyyy-MM-dd");
    const l7d_date = DateTime.now().minus({days: 8}).toFormat("yyyy-MM-dd");
    const l30d_date = DateTime.now().minus({days: 31}).toFormat("yyyy-MM-dd");
    const l90d_date = DateTime.now().minus({days: 91}).toFormat("yyyy-MM-dd");
    const l3m_start = DateTime.now().minus({months: 3}).set({day: 1}).toFormat("yyyy-MM-dd");
    const l3m_end = DateTime.now().minus({months: 1}).set({day: DateTime.now().minus({months: 1}).daysInMonth}).toFormat("yyyy-MM-dd");

    const lweek_date = DateTime.now().minus({days: 7}).toFormat("yyyy-MM-dd");

    res.render("index", {
        page_title: "Home",
        today_date: today_date,
        yday_date: yday_date,
        lweek_date: lweek_date,
        l7d_date: l7d_date,
        l30d_date: l30d_date,
    });
});


module.exports = router;
