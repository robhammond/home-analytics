const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/suppliers", async (req, res) => {
    const suppliers = await prisma.supplier.findMany({});
    res.json(suppliers);
});

router.get("/entities", async (req, res) => {
    const entities = await prisma.entity.findMany({});
    res.json(entities);
});

router.get("/cars", async (req, res) => {
    const cars = await prisma.car.findMany({});
    res.json(cars);
});

router.get("/usage/sum", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;
    let unit = req.query.unit || "day";

    if (!start) {
        start = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    if (unit == "day") {
        unit = "DATE(datetime_start, 'localtime')";
    }

    const usageSum = await prisma.$queryRaw`
        SELECT
            DATE(datetime_start, 'localtime') AS date,
            ROUND(SUM(e.kwh),2) AS kwh,
            ROUND((SUM((r.cost/100) * e.kwh)),2) AS cost
        FROM electricity e
        JOIN rates r ON
            r.id = e.rateId
        JOIN supplier s ON
            s.id = r.supplierId
        WHERE
            date(datetime_start, 'localtime') BETWEEN
            DATE(${start}) AND DATE(${end})
        GROUP BY 1
    `;
    const usageTotals = await prisma.$queryRaw`
        SELECT
            ROUND(SUM(e.kwh),2) AS kwh,
            ROUND((SUM((r.cost/100) * e.kwh)),2) AS cost
        FROM  electricity e
        JOIN rates r ON
            r.id = e.rateId
        JOIN supplier s ON
            s.id = r.supplierId
        WHERE
            date(datetime_start, 'localtime') BETWEEN
            DATE(${start}) AND DATE(${end})
    `;

    res.json({ days: usageSum, totals: usageTotals[0] });
});

router.get("/usage/days", async (req, res) => {
    let num_days = req.query.num || 7;
    num_days = `-${num_days} day`;
    const days_usage = await prisma.$queryRaw`
        WITH week(date) AS (
            SELECT date('now', 'localtime', ${num_days}) 
            UNION ALL 
            SELECT date(date, 'localtime', '+1 day') 
            FROM week 
            WHERE date < date('now', 'localtime', '-1 day') 
        )
        SELECT 
            DATE(datetime_start, 'localtime') AS date,
            CASE
                WHEN strftime('%w', datetime_start, 'localtime') = '0' THEN 'Sun'
                WHEN strftime('%w', datetime_start, 'localtime') = '1' THEN 'Mon'
                WHEN strftime('%w', datetime_start, 'localtime') = '2' THEN 'Tue'
                WHEN strftime('%w', datetime_start, 'localtime') = '3' THEN 'Wed'
                WHEN strftime('%w', datetime_start, 'localtime') = '4' THEN 'Thu'
                WHEN strftime('%w', datetime_start, 'localtime') = '5' THEN 'Fri'
                WHEN strftime('%w', datetime_start, 'localtime') = '6' THEN 'Sat'
            END AS dow,
            ROUND((s.standing_charge/100),2) AS standing_charge,
            ROUND(SUM(e.kwh),2) AS total_kwh,
            ROUND((SUM((r.cost/100) * e.kwh)),2) AS total_rate,
            ROUND((SUM((r.cost/100) * e.kwh)) + (s.standing_charge/100),2) AS total_cost
        FROM week w
        LEFT JOIN electricity e
            ON DATE(e.datetime_start, 'localtime') = w.date
        JOIN rates r ON
            r.id = e.rateId
        JOIN supplier s ON
            s.id = r.supplierId
        GROUP BY 1,2
        ORDER BY 1
    `;
    res.json({ data: days_usage });
});

router.get("/usage/entities/days", async (req, res) => {
    let num_days = req.query.num;
    num_days = `-${num_days} day`;
    const entities = await prisma.$queryRaw`
        SELECT
            DATE(datetime_start, 'localtime') AS date,
            e.entity_type,
            SUM(kwh_used) AS kwh,
            SUM(energy_cost) AS cost
        FROM EntityUsage en
        JOIN entity e ON 
            e.id = en.entityId 
        WHERE 
            DATE(datetime_start, 'localtime') = DATE('now','localtime', ${num_days})
        GROUP BY 1,2
    `;
    res.json(entities);
});

router.get("/usage/by-rate", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;

    if (!start) {
        start = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    const by_rate = await prisma.$queryRaw`
        SELECT 
            rate_type,
            ROUND(SUM(e.kwh),2) AS total_kwh,
            ROUND((SUM((r.cost/100) * e.kwh)),2) AS total_cost
        FROM  electricity e
        JOIN rates r ON
            r.id = e.rateId
        JOIN supplier s ON
            s.id = r.supplierId
            WHERE DATE(datetime_start, 'localtime') BETWEEN DATE(${start}) AND DATE(${end})
        GROUP BY 1
        ORDER BY 1
    `;
    let totals = { kwh: 0, cost: 0 };
    for (let rate of by_rate) {
        totals["kwh"] += rate["total_kwh"];
        totals["cost"] += rate["total_cost"];
    }
    res.json({ rates: by_rate, totals: totals });
});

router.get("/usage/breakdown", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;

    if (!start) {
        start = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    const overall_consumption = await prisma.$queryRaw`
        SELECT
            ROUND(SUM(e.kwh),2) AS total_kwh
        FROM electricity e
        WHERE
            DATE(datetime_start, 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
    `;
    const entities = await prisma.$queryRaw`
        SELECT 
            e.entity_type,
            ROUND(SUM(kwh_used),2) AS kwh
        FROM EntityUsage en
        JOIN entity e ON
            e.id = en.entityId 
        WHERE 
            DATE(datetime_start, 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
        GROUP BY 1
    `;

    const centralHeating = await prisma.$queryRaw`
        SELECT
            ROUND(SUM(kwh_consumed),2) AS kwh
        FROM heating
        WHERE
            DATE(datetime, 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
    `;

    const hw = await prisma.$queryRaw`
        SELECT 
            ROUND(SUM(kwh_consumed),2) AS kwh
        FROM hotwater
        WHERE
            DATE(datetime, 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
    `;

    let pieData = [];
    let heatSum = 0;
    if (centralHeating[0]) {
        let kwh = centralHeating[0].kwh || 0;
        pieData.push({ name: "Central Heating", kwh: kwh });
        heatSum += centralHeating[0].kwh;
    }
    if (hw[0]) {
        let kwh = hw[0].kwh || 0;
        pieData.push({ name: "Hot Water", kwh: kwh });
        heatSum += hw[0].kwh;
    }
    let eSum = 0;
    for (let e of entities) {
        pieData.push({ name: e.entity_type, kwh: e.kwh });
        eSum += e.kwh;
    }
    let pieOthers = 0;
    for (let y of overall_consumption) {
        pieOthers += y.total_kwh;
    }
    pieOthers = pieOthers - (heatSum + eSum);
    pieData.push({ name: "Other", kwh: Number(pieOthers.toFixed(2)) });

    res.json({ data: pieData });
});

router.get("/usage/hourly/compare", async (req, res) => {
    const date1 = req.query.date1;
    const date2 = req.query.date2;
    const unit = req.query.unit || "hour";
    let xAxis = "%H";
    if (unit == "halfhour") {
        xAxis = "%H:%M";
    }

    const hourlyUsage = await prisma.$queryRaw`
        WITH day1 AS (
            SELECT 
                strftime(${xAxis}, e.datetime_start, 'localtime') AS hour,
                ROUND(SUM(e.kwh), 2) AS total_kwh
            FROM electricity e
                JOIN rates r ON r.id = e.rateId
                JOIN supplier s ON s.id = r.supplierId
            WHERE date(datetime_start, 'localtime') = date(${date1}, 'localtime')
            GROUP BY 1
            ORDER BY 1
        ),
        day2 AS (
            SELECT 
                strftime(${xAxis}, e.datetime_start, 'localtime') AS hour,
                ROUND(SUM(e.kwh), 2) AS total_kwh
            FROM electricity e
                JOIN rates r ON r.id = e.rateId
                JOIN supplier s ON s.id = r.supplierId
            WHERE date(datetime_start, 'localtime') = date(${date2}, 'localtime')
            GROUP BY 1
            ORDER BY 1
        )
        SELECT
            y.hour,
            t.total_kwh AS kwh_td,
            y.total_kwh AS kwh_yd
        FROM day1 y
        LEFT JOIN day2 t ON
            t.hour = y.hour
    `;
    res.json({ data: hourlyUsage });
});

router.get("/usage/central-heating", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;
    let unit = req.query.unit || "day";
    if (!start) {
        if (unit == "day") {
            start = DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
        } else if (unit == "month") {
            start = DateTime.now().minus({ months: 13 }).toFormat("yyyy-MM-dd");
        }
    } else {
        // validate it's in yyyy-mm-dd format
    }
    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // validate it's in yyyy-mm-dd format
    }

    let usage = [];
    if (unit == "day") {
        usage = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m-%d', h.datetime, 'localtime') AS dt,
                ROUND(SUM(hw.kwh_consumed),2) AS hot_water_kwh,
                ROUND(SUM(h.kwh_consumed),2) AS heating_kwh
            FROM HotWater hw
            JOIN Heating h ON 
                h.datetime = hw.datetime
                AND h.granularity = hw.granularity
            WHERE
                h.granularity = 'daily'
                AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
            GROUP BY 1 ORDER BY 1
        `;
    } else if (unit == "month") {
        usage = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m', h.datetime, 'localtime') AS dt,
            ROUND(SUM(hw.kwh_consumed),2) AS hot_water_kwh,
            ROUND(SUM(h.kwh_consumed),2) AS heating_kwh
        FROM HotWater hw
        JOIN Heating h ON 
            h.datetime = hw.datetime
            AND h.granularity = hw.granularity
        WHERE
            h.granularity = 'daily'
            AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
        GROUP BY 1 ORDER BY 1
        `;
    }
    res.json({ data: usage });
});

router.get("/usage/vehicles", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;
    let unit = req.query.unit || "day";
    if (!start) {
        start = DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }

    let usage = [];

    if (unit == "day") {
        usage = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m-%d', datetime_start, 'localtime') AS dt,
                ROUND(SUM(kwh_used),2) AS kwh,
                ROUND(SUM(energy_cost),2) AS cost
            FROM EntityUsage eu
            JOIN Entity e ON
                e.id = eu.entityId 
            WHERE
                e.entity_type = 'Car Charging'
                and
                DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            GROUP BY
                1
            ORDER BY
                1
        `;
    } else if (unit == "month") {
        usage = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m', datetime_start, 'localtime') AS dt,
                ROUND(SUM(kwh_used),2) AS kwh,
                ROUND(SUM(energy_cost),2) AS cost
            FROM EntityUsage eu
            JOIN Entity e ON
                e.id = eu.entityId 
            WHERE
                e.entity_type = 'Car Charging'
                and
                DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            GROUP BY
                1
            ORDER BY
                1
        `;
    }
    let totals = { kwh: 0, cost: 0 };
    for (let rate of usage) {
        totals["kwh"] += rate["kwh"];
        totals["cost"] += rate["cost"];
    }
    totals["kwh"] = Number(totals["kwh"].toFixed(2));
    totals["cost"] = Number(totals["cost"].toFixed(2));
    res.json({ data: usage, totals: totals });
});

router.get("/usage/main", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;
    let unit = req.query.unit || "day";
    let filter = req.query.filter || "all";

    let startMinusTime = {};
    let endMinusTime = {};

    if (unit == "halfhour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit == "hour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit == "day") {
        startMinusTime = { days: 30 };
        endMinusTime = { days: 1 };
    } else if (unit == "month") {
        startMinusTime = { months: 24 };
        endMinusTime = { days: 1 };
    }
    if (!start) {
        start = DateTime.now().minus(startMinusTime).toFormat("yyyy-MM-dd");
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    if (!end) {
        end = DateTime.now().minus(endMinusTime).toFormat("yyyy-MM-dd");
        console.log(end);
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    let usage = [];
    let totals = [];
    if (unit == "halfhour") {
        if (filter == "all") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime("%Y-%m-%d %H:%M", e.datetime_start, 'localtime') AS dt,
                    r.rate_type,
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1, 2
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else {
            usage = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0) AS dt,
                    r.rate_type,
                    ROUND(SUM(eu.kwh_used),4) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),4) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    DATE(eu.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    AND e.entity_type = ${filter}
                GROUP BY 1, 2
                ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    ROUND(SUM(eu.kwh_used),4) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    DATE(eu.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    AND e.entity_type = ${filter}
            `;
        }
    } else if (unit == "hour") {
        if (filter == "all") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime("%Y-%m-%d %H", e.datetime_start, 'localtime') AS dt,
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM
                    Electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN Supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM
                    electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else {
            usage = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start) AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    strftime("%Y-%m-%d %H", CAST(julianday(eu.datetime_start, 'localtime') * 24 AS INTEGER) / 24.0) AS dt,
                    '' AS rate_type,
                    ROUND(SUM(eu.kwh_used),4) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    DATE(eu.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    AND e.entity_type = ${filter}
                GROUP BY 1, 2
                ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start) AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    ROUND(SUM(eu.kwh_used),4) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    DATE(eu.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    AND e.entity_type = ${filter}
            `;
        }
    } else if (unit == "day") {
        if (filter == "all") {
            usage = await prisma.$queryRaw`
                SELECT
                    DATE(e.datetime_start, 'localtime') AS dt,
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "central-heating") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d', h.datetime, 'localtime') AS dt,
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM Heating h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM Heating h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "hot_water") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d', h.datetime, 'localtime') AS dt,
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM HotWater h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM HotWater h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "car_charges") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId 
                WHERE
                    e.entity_type = 'Car Charging'
                    and
                    DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId 
                WHERE
                    e.entity_type = 'Car Charging'
                    and
                    DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else {
            usage = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start) AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    strftime('%Y-%m-%d', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    e.entity_type = ${filter}
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1
                ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start) BETWEEN ${start} AND ${end}
                )
                SELECT
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    e.entity_type = ${filter}
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        }
    } else if (unit == "month") {
        if (filter == "all") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime("%Y-%m", e.datetime_start, 'localtime') AS dt,
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(e.kwh),2) AS kwh,
                    ROUND(SUM(r.cost/100 * e.kwh),2) AS cost
                FROM electricity e
                JOIN rates r ON
                    r.id = e.rateId
                JOIN supplier s ON
                    s.id = r.supplierId
                WHERE
                    DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "central-heating") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m', h.datetime, 'localtime') AS dt,
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM Heating h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM Heating h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "hot_water") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m', h.datetime, 'localtime') AS dt,
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM HotWater h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(h.kwh_consumed),2) AS kwh,
                    0.0 AS cost
                FROM HotWater h
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else if (filter == "car_charges") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId 
                WHERE
                    e.entity_type = 'Car Charging'
                    and
                    DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
            totals = await prisma.$queryRaw`
                SELECT
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId 
                WHERE
                    e.entity_type = 'Car Charging'
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        } else {
            usage = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    strftime('%Y-%m', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    e.entity_type = ${filter}
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1
                ORDER BY 1
            `;
            totals = await prisma.$queryRaw`
                WITH rate_list AS (
                    SELECT 
                        strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                        rateId
                    FROM Electricity
                    WHERE
                        DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                )
                SELECT
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                FROM EntityUsage eu
                JOIN Entity e ON
                    e.id = eu.entityId
                JOIN rate_list e2 ON
                    hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                JOIN rates r ON r.id = e2.rateId
                WHERE
                    e.entity_type = ${filter}
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
            `;
        }
    }
    res.json({ data: usage, totals: totals[0] });
});

router.get("/carbon/breakdown", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;

    if (!start) {
        start = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // validate it's in yyyy-mm-dd format
    }

    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // validate it's in yyyy-mm-dd format
    }
    const carbon = await prisma.$queryRaw`
        SELECT
            ROUND(AVG(biomass),2) AS biomass,
            ROUND(AVG(coal),2) AS coal,
            ROUND(AVG(gas),2) AS gas,
            ROUND(AVG(hydro),2) AS hydro,
            ROUND(AVG(imports),2) AS imports,
            ROUND(AVG(nuclear),2) AS nuclear,
            ROUND(AVG(other),2) AS other,
            ROUND(AVG(solar),2) AS solar,
            ROUND(AVG(wind),2) AS wind
        FROM CarbonIntensity
        WHERE
            DATE(datetime_start, 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
    `;

    res.json({ data: carbon[0] });
});

router.get("/carbon/main", async (req, res) => {
    let start = req.query.start;
    let end = req.query.end;
    let label_format = req.query.label_format || "ymdhm";
    if (label_format == "ymdhm") {
        label_format = "%Y-%m-%d %H:%M";
    } else if (label_format == "hm") {
        label_format = "%H:%M";
    }

    if (!start) {
        start = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // validate it's in yyyy-mm-dd format
    }

    if (!end) {
        end = DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd");
    } else {
        // validate it's in yyyy-mm-dd format
    }
    let carbon = await prisma.$queryRaw`
        SELECT
            strftime(${label_format}, e.datetime_start, 'localtime') AS dt,
            ROUND(SUM(e.intensityForecast),2) AS forecast
        FROM
            CarbonIntensity e
        WHERE
            DATE(e.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
        GROUP BY 1
        ORDER BY
            1
    `;

    res.json({ data: carbon });
});

router.get("/vehicles/status", async (req, res) => {
    const carStatus = await prisma.$queryRaw`
        SELECT
            cs.carId,
            cs.datetime,
            CASE
                WHEN odometerUnit = 'km' THEN ROUND(odometer * 0.62137,0)
                ELSE ROUND(odometer,0)
            END AS odometer,
            batteryPercent,
            CASE
                WHEN rangeUnit = 'km' THEN ROUND(estimatedRange * 0.62137, 0)
                ELSE ROUND(estimatedRange,0)
            END AS estimatedRange,
            chargingStatus,
            chargingTargetPercent,
            isLocked,
            c.*
        FROM CarStatus cs, 
	    (SELECT carId, MAX(datetime) AS datetime
            FROM CarStatus GROUP BY 1) max_date 
        JOIN Car c ON
            cs.carId = c.id
        WHERE
        cs.carId = max_date.carId 
	    AND cs.datetime = max_date.datetime
    `;

    res.json({ data: carStatus });
});

module.exports = router;
