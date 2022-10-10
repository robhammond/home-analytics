const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    dates = req.app.locals.dateShortcuts;

    res.render("pi", {
        layout: "./layouts/fullscreen",
        page_title: "Pi Display",
        dates: dates,
    });

});

module.exports = router;