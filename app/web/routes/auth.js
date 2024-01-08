const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/register", async (req, res) => {
    try {
        const user = await prisma.user.findFirst();
        if (user) {
            req.flash("info", "User already exists, please login");
            res.redirect("/login");
        }
        res.render("register", { title: "Register", layout: "layouts/auth-layout" });
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred.");
    }
});

router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                username,
            },
        });

        if (existingUser) {
            req.flash("info", "User already exists");
            res.redirect("back");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        req.session.user = { id: user.id, username: user.username };

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error registering user");
    }
});

router.get("/login", async (req, res) => {
    const returnUrl = req.query.returnUrl || "/";
    res.render("login", { title: "Login", layout: "layouts/auth-layout", returnUrl });
});

router.post("/login", async (req, res) => {
    const { username, password, returnUrl } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
        });

        if (!user) {
            req.flash("error", "User not found");
            res.redirect("back");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            req.session.user = { id: user.id, username: user.username };
            res.redirect(returnUrl);
        } else {
            req.flash("error", "Incorrect password, please try again");
            res.redirect("back");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred.");
    }
});

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.redirect("/");
        }
        res.clearCookie("connect.sid"); // The name of the cookie used may vary.
        res.redirect("/login");
    });
});

module.exports = router;
