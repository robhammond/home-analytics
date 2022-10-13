const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {

    res.render("pi", {
        layout: "./layouts/fullscreen",
        page_title: "Pi Display",
        dates: res.locals.dateShortcuts,
    });

});

module.exports = router;