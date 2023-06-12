const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const appEnv = process.env.APP_ENV;
    const envDb = process.env.HA_DB_URL;
    const envDate = new Date();
    res.render("admin", {
        page_title: "Admin",
        appEnv: appEnv,
        envDb: envDb,
        envDate: envDate,
    });
});

router.get("/add-rate", async (req, res) => {
    const supplier_id = req.query.supplier_id;
    res.render("admin/add-rate", { page_title: "Admin", supplier_id: supplier_id });
});

router.post("/add-rate", async (req, res) => {
    const { supplier_id, rate_type, cost, start_time, end_time } = req.body;
    const rates_res = await prisma.rates.create({
        data: {
            supplier: {
                connect: { id: Number(supplier_id) },
            },
            rate_type: rate_type,
            cost: parseFloat(cost),
            currency: "gbp",
            start_time: start_time,
            end_time: end_time,
        },
        include: {
            supplier: true,
        },
    });
    res.redirect("/admin/list-tariffs");
});

router.get("/add-tariff", async (req, res) => {
    res.render("admin/add-tariff", { page_title: "Admin" });
});

router.get("/edit-tariff", async (req, res) => {
    let supplier = await prisma.supplier.findFirst({
        where: {
            id: Number(req.query.id),
        },
        include: {
            rates: true,
        },
    });

    if (supplier["supplier_start"]) {
        supplier["supplier_start"] = supplier["supplier_start"].toISOString().substring(0, 10);
    }
    if (supplier["supplier_end"]) {
        supplier["supplier_end"] = supplier["supplier_end"].toISOString().substring(0, 10);
    }

    res.render("admin/edit-tariff", { page_title: "Admin", supplier: supplier });
});

router.post("/edit-tariff", async (req, res) => {
    let { id, tariff_name, supplier, standing_charge, supplier_start, supplier_end } = req.body;

    if (supplier_start == "") {
        supplier_start = null;
    } else {
        supplier_start = new Date(supplier_start).toISOString();
    }
    if (supplier_end == "") {
        supplier_end = null;
    } else {
        supplier_end = new Date(supplier_end).toISOString();
    }

    const supplier_res = await prisma.supplier.update({
        where: {
            id: Number(id),
        },
        data: {
            tariff_name: tariff_name,
            supplier: supplier,
            standing_charge: parseFloat(standing_charge),
            supplier_start: supplier_start,
            supplier_end: supplier_end,
        },
    });

    res.redirect("/admin/list-tariffs");
});

router.post("/add-tariff", async (req, res) => {
    let {
        tariff_name,
        supplier,
        cost,
        standing_charge,
        currency,
        start_time,
        end_time,
        supplier_start,
        supplier_end,
        rate_type,
    } = req.body;

    if (supplier_start == "") {
        supplier_start = null;
    } else {
        supplier_start = new Date(supplier_start);
    }
    if (supplier_end == "") {
        supplier_end = null;
    } else {
        supplier_end = new Date(supplier_end);
    }

    // console.log({
    //     supplier: supplier,
    //     tariff_name: tariff_name,
    //     standing_charge: parseFloat(standing_charge),
    //     supplier_start: supplier_start,
    //     supplier_end: supplier_end,
    // });

    const supplier_res = await prisma.supplier.create({
        data: {
            supplier: supplier,
            tariff_name: tariff_name,
            standing_charge: parseFloat(standing_charge),
            supplier_start: supplier_start,
            supplier_end: supplier_end,
        },
    });

    const rates_res = await prisma.rates.create({
        data: {
            supplierId: supplier_res["id"],
            rate_type: rate_type,
            cost: parseFloat(cost),
            currency: currency,
            start_time: start_time,
            end_time: end_time,
        },
    });

    res.redirect("/admin/list-tariffs");
});


router.get("/delete-tariff", async (req, res) => {
    try {
        const rates = await prisma.rates.deleteMany({
            where: {
                supplierId: Number(req.query.id),
            },
        });
        const supplier = await prisma.supplier.delete({
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

router.get("/list-tariffs", async (req, res) => {
    const tariffs = await prisma.supplier.findMany({
        include: {
            rates: true,
        },
        orderBy: [
            {
                supplier_start: "desc",
            },
        ],
    });
    res.render("admin/list-tariffs", { page_title: "List Tariffs", tariffs: tariffs });
});

router.get("/add-vehicle", async (req, res) => {
    res.render("admin/add-vehicle", { page_title: "Add vehicle" });
});

router.post("/add-vehicle", async (req, res) => {
    let {
        make,
        model,
        variant,
        batterySize,
        registrationNumber,
        imageUrl,
        vin,
        purchasePrice,
        purchaseOdometer,
        motDate,
        taxDate,
        serviceDate,
        dateAcquired,
    } = req.body;

    if (motDate == "") {
        motDate = null;
    }
    if (serviceDate == "") {
        serviceDate = null;
    }
    if (dateAcquired == "") {
        dateAcquired = null;
    }
    if (taxDate == "") {
        taxDate = null;
    }

    const car_res = await prisma.car.create({
        data: {
            make: make,
            model: model,
            variant: variant,
            batterySize: Number(batterySize),
            registrationNumber: registrationNumber,
            imageUrl: imageUrl,
            vin: vin,
            purchasePrice: Number(purchasePrice),
            purchaseOdometer: Number(purchaseOdometer),
            motDate: motDate,
            serviceDate: serviceDate,
            taxDate: taxDate,
            dateAcquired: dateAcquired,
        },
    });
    res.redirect("/admin/list-vehicles");
});

router.get("/edit-vehicle", async (req, res) => {
    const id = req.query.id;
    const vehicle = await prisma.car.findFirst({
        where: {
            id: Number(id),
        },
    });
    res.render("admin/edit-vehicle", { page_title: "Edit vehicle", vehicle: vehicle });
});

router.post("/edit-vehicle", async (req, res) => {
    let {
        id,
        make,
        model,
        variant,
        batterySize,
        registrationNumber,
        imageUrl,
        vin,
        purchasePrice,
        purchaseOdometer,
        motDate,
        taxDate,
        serviceDate,
        dateAcquired,
    } = req.body;

    if (motDate == "") {
        motDate = null;
    } else {
        motDate = motDate;
    }
    if (taxDate == "") {
        taxDate = null;
    } else {
        taxDate = taxDate;
    }
    if (serviceDate == "") {
        serviceDate = null;
    } else {
        serviceDate = serviceDate;
    }
    if (dateAcquired == "") {
        dateAcquired = null;
    } else {
        dateAcquired = dateAcquired;
    }
    const car_res = await prisma.car.update({
        data: {
            make: make,
            model: model,
            variant: variant,
            batterySize: Number(batterySize),
            registrationNumber: registrationNumber,
            imageUrl: imageUrl,
            vin: vin,
            purchasePrice: Number(purchasePrice),
            purchaseOdometer: Number(purchaseOdometer),
            motDate: motDate,
            taxDate: taxDate,
            serviceDate: serviceDate,
            dateAcquired: dateAcquired,
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
    let { entity_name, entity_type, entity_category, entity_backend, entity_url, entity_image, entity_location } = req.body;

    try {
        await prisma.entity.create({
            data: {
                entity_name: entity_name,
                entity_type: entity_type,
                entity_category: entity_category,
                entity_backend: entity_backend,
                entity_url: entity_url,
                entity_image: entity_image,
                entity_location: entity_location,
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
    res.render("admin/list-entities", { page_title: "List Entities", entities: entities });
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
    res.render("admin/view-entity", { page_title: "View Entity", entity: entity, creds: creds });
});

router.get("/edit-entity", async (req, res) => {
    const entity = await prisma.entity.findFirst({
        where: {
            id: Number(req.query.id),
        },
    });
    res.render("admin/edit-entity", { page_title: "Edit Entity", entity: entity });
});

router.post("/edit-entity", async (req, res) => {
    let { id, entity_name, entity_type, entity_category, entity_backend, entity_url, entity_image, entity_location } = req.body;
    try {
        await prisma.entity.update({
            where: {
                id: Number(id),
            },
            data: {
                entity_name: entity_name,
                entity_type: entity_type,
                entity_category: entity_category,
                entity_backend: entity_backend,
                entity_url: entity_url,
                entity_image: entity_image,
                entity_location: entity_location,
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
                id: id,
            },
        });
        res.render("admin/add-credentials", { page_title: "Add credentials", entity: entity });
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
                key: key,
                value: value,
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
            id: id,
        },
        include: {
            entity: true,
        },
    });
    res.render("admin/edit-credentials", { page_title: "Edit credentials", cred: cred });
});

router.post("/edit-credentials", async (req, res) => {
    const { id, key, value, entity_id } = req.body;
    try {
        const cred = await prisma.credentials.update({
            where: {
                id: Number(id),
            },
            data: {
                key: key,
                value: value,
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
    res.render("admin/list-vehicles", { page_title: "List vehicles", vehicles: vehicles });
});

module.exports = router;
