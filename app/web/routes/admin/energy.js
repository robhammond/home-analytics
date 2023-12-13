const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/api/init", async (req, res) => {
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
    res.render("admin/energy/add-rate", { title: "Admin", supplier_id, tariff });
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
    res.redirect("/admin/energy/list-tariffs");
});

router.get("/add-tariff", async (req, res) => {
    res.render("admin/energy/add-tariff", { title: "Add Tariff" });
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

        res.render("admin/energy/edit-tariff", { title: "Edit Tariff", supplier });
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

    res.redirect("/admin/energy/list-tariffs");
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
        res.redirect("/admin/energy/list-tariffs");
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
    res.render("admin/energy/list-tariffs", { title: "List Tariffs", tariffs });
});

module.exports = router;
