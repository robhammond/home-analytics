const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/register", async (req, res) => {
    try {
        const user = await prisma.user.findFirst();

        if (user) {
        // Redirect to login if a user already exists
            return res.redirect("/login");
        }

        res.render("register", { page_title: "Register", layout: "layouts/auth-layout" });
    } catch (error) {
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
            return res.send("User already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        res.redirect("/login");
    } catch (error) {
        res.status(500).send("Error in registration.");
    }
});

router.get("/login", async (req, res) => {
    res.render("login", { page_title: "Login", layout: "layouts/auth-layout" });
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
        });

        if (!user) {
            return res.send("User not found.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // Login success
            req.session.user = { id: user.id, username: user.username };
            res.send("Login successful!");
        } else {
            res.send("Incorrect password.");
        }
    } catch (error) {
        res.status(500).send("An error occurred.");
    }
});

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/");
        }
        res.clearCookie("connect.sid"); // The name of the cookie used may vary.
        res.redirect("/login");
    });
});

module.exports = router;
