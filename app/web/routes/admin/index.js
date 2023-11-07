const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const energyRoutes = require("./energy");

router.use("/energy", energyRoutes);

router.get("/", async (req, res) => {
    const appEnv = process.env.APP_ENV;
    const envDb = process.env.HA_DB_URL;
    const envDate = new Date();

    res.render("admin", {
        page_title: "Admin",
        appEnv,
        envDb,
        envDate,
    });
});

router.get("/add-vehicle", async (req, res) => {
    res.render("admin/add-vehicle", { page_title: "Add vehicle" });
});

router.post("/add-vehicle", async (req, res) => {
    let {
        make,
        model,
        variant,
        battery_size,
        registration_number,
        image_url,
        vin,
        purchase_price,
        purchase_odometer,
        mot_date,
        tax_date,
        service_date,
        date_purchased,
    } = req.body;

    if (mot_date === "") {
        mot_date = null;
    }
    if (service_date === "") {
        service_date = null;
    }
    if (date_purchased === "") {
        date_purchased = null;
    }
    if (tax_date === "") {
        tax_date = null;
    }

    const car_res = await prisma.car.create({
        data: {
            make,
            model,
            variant,
            battery_size: Number(battery_size),
            registration_number,
            image_url,
            vin,
            purchase_price: Number(purchase_price),
            purchase_odometer: Number(purchase_odometer),
            mot_date,
            service_date,
            tax_date,
            date_purchased,
        },
    });
    res.redirect("/admin/list-vehicles");
});

router.get("/edit-vehicle", async (req, res) => {
    const { id } = req.query;
    const vehicle = await prisma.car.findFirst({
        where: {
            id: Number(id),
        },
    });
    res.render("admin/edit-vehicle", { page_title: "Edit vehicle", vehicle });
});

router.post("/edit-vehicle", async (req, res) => {
    let {
        id,
        make,
        model,
        variant,
        battery_size,
        registration_number,
        image_url,
        vin,
        purchase_price,
        purchase_odometer,
        mot_date,
        tax_date,
        service_date,
        date_purchased,
    } = req.body;

    if (mot_date === "") {
        mot_date = null;
    }
    if (tax_date === "") {
        tax_date = null;
    }
    if (service_date === "") {
        service_date = null;
    }
    if (date_purchased === "") {
        date_purchased = null;
    }
    const car_res = await prisma.car.update({
        data: {
            make,
            model,
            variant,
            battery_size: Number(battery_size),
            registration_number,
            image_url,
            vin,
            purchase_price: Number(purchase_price),
            purchase_odometer: Number(purchase_odometer),
            mot_date,
            tax_date,
            service_date,
            date_purchased,
        },
        where: {
            id: Number(id),
        },
    });
    res.redirect("/admin/list-vehicles");
});

router.get("/add-entity", async (req, res) => {
    res.render("admin/add-entity", { page_title: "Add entity" });
});

router.post("/add-entity", async (req, res) => {
    const {
        entity_name, entity_type, entity_category, entity_backend, entity_url, entity_image, entity_location,
    } = req.body;

    try {
        await prisma.entity.create({
            data: {
                entity_name,
                entity_type,
                entity_category,
                entity_backend,
                entity_url,
                entity_image,
                entity_location,
            },
        });
        res.redirect("/admin/list-entities");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/list-entities", async (req, res) => {
    const entities = await prisma.entity.findMany();
    res.render("admin/list-entities", { page_title: "List Entities", entities });
});

router.get("/view-entity", async (req, res) => {
    const entity = await prisma.entity.findFirst({
        where: {
            id: Number(req.query.id),
        },
    });
    const creds = await prisma.credentials.findMany({
        where: {
            entityId: Number(req.query.id),
        },
    });
    res.render("admin/view-entity", { page_title: "View Entity", entity, creds });
});

router.get("/edit-entity", async (req, res) => {
    const entity = await prisma.entity.findFirst({
        where: {
            id: Number(req.query.id),
        },
    });
    res.render("admin/edit-entity", { page_title: "Edit Entity", entity });
});

router.post("/edit-entity", async (req, res) => {
    const {
        id, entity_name, entity_type, entity_category, entity_backend, entity_url, entity_image, entity_location,
    } = req.body;
    try {
        await prisma.entity.update({
            where: {
                id: Number(id),
            },
            data: {
                entity_name,
                entity_type,
                entity_category,
                entity_backend,
                entity_url,
                entity_image,
                entity_location,
            },
        });
        res.redirect("/admin/list-entities");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/delete-entity", async (req, res) => {
    try {
        const entity = await prisma.entity.delete({
            where: {
                id: Number(req.query.id),
            },
        });
        res.redirect("back");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/delete-credentials", async (req, res) => {
    try {
        const creds = await prisma.credentials.delete({
            where: {
                id: Number(req.query.id),
            },
        });
        res.redirect("back");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/add-credentials", async (req, res) => {
    const id = Number(req.query.id);
    try {
        const entity = await prisma.entity.findFirst({
            where: {
                id,
            },
        });
        res.render("admin/add-credentials", { page_title: "Add credentials", entity });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.post("/add-credentials", async (req, res) => {
    const { id, key, value } = req.body;
    try {
        const credentials = await prisma.credentials.create({
            data: {
                entity: {
                    connect: { id: Number(id) },
                },
                key,
                value,
            },
            include: {
                entity: true,
            },
        });
        res.redirect(`/admin/view-entity?id=${id}`);
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/edit-credentials", async (req, res) => {
    const id = Number(req.query.id);
    const cred = await prisma.credentials.findFirst({
        where: {
            id,
        },
        include: {
            entity: true,
        },
    });
    res.render("admin/edit-credentials", { page_title: "Edit credentials", cred });
});

router.post("/edit-credentials", async (req, res) => {
    const {
        id, key, value, entity_id,
    } = req.body;
    try {
        const cred = await prisma.credentials.update({
            where: {
                id: Number(id),
            },
            data: {
                key,
                value,
            },
        });
        res.redirect(`/admin/view-entity?id=${entity_id}`);
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/list-vehicles", async (req, res) => {
    const vehicles = await prisma.car.findMany();
    res.render("admin/list-vehicles", { page_title: "List vehicles", vehicles });
});

module.exports = router;
