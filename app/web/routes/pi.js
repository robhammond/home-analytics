const express = require("express");
const router = express.Router();
const { dateShortcuts } = require("../globals");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {

    res.render("pi", {
        layout: "./layouts/fullscreen",
        page_title: "Pi Display",
        dates: dateShortcuts,
    });

});

module.exports = router;