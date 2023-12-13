const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const energyRoutes = require("./energy");
const tasksRoutes = require("./tasks");

router.use("/energy", energyRoutes);
router.use("/tasks", tasksRoutes);

router.get("/", async (req, res) => {
    const appEnv = process.env.APP_ENV;
    const envDb = process.env.HA_DB_URL;
    const envDate = new Date();

    res.render("admin", {
        title: "Admin",
        appEnv,
        envDb,
        envDate,
    });
});

router.get("/add-vehicle", async (req, res) => {
    res.render("admin/add-vehicle", { title: "Add vehicle" });
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
    res.render("admin/edit-vehicle", { title: "Edit vehicle", vehicle });
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
    res.render("admin/add-entity", { title: "Add entity" });
});

router.post("/add-entity", async (req, res) => {
    const {
        entity_name, entity_type, entity_category, entity_backend, entity_url, entity_image, entity_location,
    } = req.body;

    try {
        await prisma.entity.create({
            data: {
                name: entity_name,
                type: entity_type,
                category: entity_category,
                backend: entity_backend,
                url: entity_url,
                image: entity_image,
                location: entity_location,
            },
        });
        res.redirect("/admin/list-entities");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/list-apis", async (req, res) => {
    let apis = [];
    try {
        apis = await prisma.api.findMany({
            include: {
                credentials: true,
            },
            orderBy: [
                {
                    name: "asc",
                },
            ],
        });
        res.render("admin/list-apis", { title: "Energy Data Imports", apis });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.post("/list-apis", async (req, res) => {
    const { cred_id, value } = req.body;
    try {
        await prisma.apiCredentials.update({
            where: {
                id: Number(cred_id),
            },
            data: {
                value,
            },
        });
        res.redirect("back");
    } catch (err) {
        console.log(err);
        res.status(500).message("Error Updating Creds");
    }
});

router.get("/add-api", async (req, res) => {
    res.render("admin/add-api", { title: "Add api" });
});

router.post("/add-api", async (req, res) => {
    const {
        api_name, api_type,
    } = req.body;

    try {
        await prisma.api.create({
            data: {
                name: api_name,
                type: api_type,
            },
        });
        res.redirect("/admin/list-apis");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.post("/add-api-key", async (req, res) => {
    const {
        api_id, new_key, new_value,
    } = req.body;

    try {
        await prisma.apiCredentials.create({
            data: {
                api_id: Number(api_id),
                key: new_key,
                value: new_value,
            },
        });
        res.redirect("/admin/list-apis");
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error - Please try again.");
    }
});

router.get("/list-entities", async (req, res) => {
    const entities = await prisma.entity.findMany();
    res.render("admin/list-entities", { title: "List Entities", entities });
});

router.get("/view-entity", async (req, res) => {
    try {
        const entity = await prisma.entity.findFirst({
            where: {
                id: Number(req.query.id),
            },
        });
        const creds = await prisma.entityAttributes.findMany({
            where: {
                entity_id: Number(req.query.id),
            },
        });
        res.render("admin/view-entity", { title: "View Entity", entity, creds });
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
});

router.get("/edit-entity", async (req, res) => {
    const entity = await prisma.entity.findFirst({
        where: {
            id: Number(req.query.id),
        },
    });
    res.render("admin/edit-entity", { title: "Edit Entity", entity });
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
                name: entity_name,
                type: entity_type,
                category: entity_category,
                backend: entity_backend,
                url: entity_url,
                image: entity_image,
                location: entity_location,
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
        res.render("admin/add-credentials", { title: "Add credentials", entity });
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
    res.render("admin/edit-credentials", { title: "Edit credentials", cred });
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
    res.render("admin/list-vehicles", { title: "List vehicles", vehicles });
});

module.exports = router;
