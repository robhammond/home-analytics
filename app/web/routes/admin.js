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
        appEnv,
        envDb,
        envDate,
    });
});

router.get("/energy/api/init", async (req, res) => {
    const {
        mpan, serial_number, api_key, auth_header,
    } = req.query;
    const api_id = parseInt(req.query.api_id, 10);

    console.log(mpan);
    console.log(serial_number);
    console.log(api_key);

    if (api_id === 2) {
        try {
            await prisma.apiCredentials.update({
                where: {
                    api_id_key: {
                        api_id,
                        key: "mpan",
                    },
                },
                data: {
                    value: mpan,
                },
            });
        } catch (error) {
            console.log(`Error updating mpan: ${error.message}`);
        }
        try {
            await prisma.apiCredentials.update({
                where: {
                    api_id_key: {
                        api_id,
                        key: "serial_number",
                    },
                },
                data: {
                    value: serial_number,
                },
            });
        } catch (error) {
            console.log(`Error updating serial_number: ${error.message}`);
        }
        try {
            await prisma.apiCredentials.update({
                where: {
                    api_id_key: {
                        api_id,
                        key: "api_key",
                    },
                },
                data: {
                    value: api_key,
                },
            });
        } catch (error) {
            console.log(`Error updating api_key: ${error.message}`);
        }
    } else if (api_id === 1) {
        try {
            await prisma.apiCredentials.update({
                where: {
                    api_id_key: {
                        api_id,
                        key: "auth_header",
                    },
                },
                data: {
                    value: auth_header,
                },
            });
        } catch (error) {
            console.log(error);
        }
    } else {
        console.error("API ID not found!");
    }

    res.redirect("/");
});

router.get("/add-rate", async (req, res) => {
    const { supplier_id } = req.query;
    const tariff = await prisma.energySupplier.findFirst({
        where: {
            id: Number(supplier_id),
        },
    });
    res.render("admin/add-rate", { page_title: "Admin", supplier_id, tariff });
});

router.post("/add-rate", async (req, res) => {
    const {
        supplier_id, rate_type, cost, start_time, end_time,
    } = req.body;
    const rates_res = await prisma.energyRate.create({
        data: {
            supplier: {
                connect: { id: Number(supplier_id) },
            },
            rate_type,
            cost: parseFloat(cost),
            currency: "gbp",
            start_time,
            end_time,
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
    try {
        const supplier = await prisma.energySupplier.findFirst({
            where: {
                id: Number(req.query.id),
            },
            include: {
                energy_rates: true,
            },
        });

        if (supplier.supplier_start) {
            supplier.supplier_start = supplier.supplier_start.toISOString().substring(0, 10);
        }
        if (supplier.supplier_end) {
            supplier.supplier_end = supplier.supplier_end.toISOString().substring(0, 10);
        }

        res.render("admin/edit-tariff", { page_title: "Admin", supplier });
    } catch (err) {
        res.status(500);
    }
});

router.post("/edit-tariff", async (req, res) => {
    let {
        id, tariff_name, tariff_type, supplier, standing_charge, supplier_start, supplier_end,
    } = req.body;

    if (supplier_start === "") {
        supplier_start = null;
    } else {
        supplier_start = new Date(supplier_start).toISOString();
    }
    if (supplier_end === "") {
        supplier_end = null;
    } else {
        supplier_end = new Date(supplier_end).toISOString();
    }
    if (standing_charge === "") {
        standing_charge = null;
    } else {
        standing_charge = parseFloat(standing_charge);
    }

    const supplier_res = await prisma.energySupplier.update({
        where: {
            id: Number(id),
        },
        data: {
            tariff_name,
            tariff_type,
            supplier,
            standing_charge,
            supplier_start,
            supplier_end,
        },
    });

    res.redirect("/admin/list-tariffs");
});

router.post("/add-tariff", async (req, res) => {
    let {
        tariff_name,
        tariff_type,
        name,
        cost,
        standing_charge,
        currency,
        start_time,
        end_time,
        supplier_start,
        supplier_end,
        rate_type,
    } = req.body;

    if (supplier_start === "") {
        supplier_start = null;
    } else {
        supplier_start = new Date(supplier_start);
    }
    if (supplier_end === "") {
        supplier_end = null;
    } else {
        supplier_end = new Date(supplier_end);
    }
    if (standing_charge === "") {
        standing_charge = null;
    } else {
        standing_charge = parseFloat(standing_charge);
    }

    try {
        const supplier_res = await prisma.energySupplier.create({
            data: {
                name,
                tariff_name,
                tariff_type,
                standing_charge,
                supplier_start,
                supplier_end,
            },
        });
        res.redirect("/admin/list-tariffs");
    } catch (e) {
        console.log(e);
        res.status(500);
    }
});

router.get("/delete-tariff", async (req, res) => {
    try {
        const rates = await prisma.energyRate.deleteMany({
            where: {
                supplier_id: Number(req.query.id),
            },
        });
        const supplier = await prisma.energySupplier.delete({
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
    let tariffs = [];
    try {
        tariffs = await prisma.energySupplier.findMany({
            include: {
                energy_rates: true,
            },
            orderBy: [
                {
                    supplier_start: "desc",
                },
            ],
        });
    } catch (err) {
        // res.status(500).send("No tariffs found!");
        console.log(err);
    }
    res.render("admin/list-tariffs", { page_title: "List Tariffs", tariffs });
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
