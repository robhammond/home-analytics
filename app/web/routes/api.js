const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function dbQueryRateInfo(start, end, tryCount = 1) {
    try {
        const by_rate = await prisma.$queryRaw`
            SELECT
                r.rate_type,
                ROUND(SUM(ge.kwh_imported),2) AS total_kwh,
                ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS total_cost,
                ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
            FROM grid_energy ge
            JOIN energy_rates r ON
                r.id = ge.rate_id
            LEFT JOIN energy_rates r2 ON
                r2.id = ge.export_rate_id
            JOIN energy_suppliers s ON
                s.id = r.supplier_id
                WHERE DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN DATE(${start}) AND DATE(${end})
            GROUP BY 1
            ORDER BY 1
      `;
        return by_rate;
    } catch (e) {
        if (e.code === "SQLITE_BUSY" && tryCount < 3) {
            console.log("Database is locked, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return dbQueryRateInfo(start, end, tryCount + 1); // Retry the query
        }
        throw e;
    }
}

async function dbUsageSumInfo(start, end, tryCount = 1) {
    try {
        const usageSum = await prisma.$queryRaw`
            SELECT
            DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') AS date,
                ROUND(SUM(ge.kwh_imported),2) AS kwh,
                ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS cost,
                ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
            FROM grid_energy ge
            JOIN energy_rates r ON
                r.id = ge.rate_id
            LEFT JOIN energy_rates r2 ON
                r2.id = ge.export_rate_id
            JOIN energy_suppliers s ON
                s.id = r.supplier_id
            WHERE
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
            GROUP BY 1
        `;
        return usageSum;
    } catch (e) {
        if (e.code === "SQLITE_BUSY" && tryCount < 3) {
            console.log("Database is locked, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return dbUsageSumInfo(start, end, tryCount + 1); // Retry the query
        }
        throw e;
    }
}

async function dbUsageTotals(start, end, tryCount = 1) {
    try {
        const usageTotals = await prisma.$queryRaw`
            SELECT
                ROUND(SUM(ge.kwh_imported),2) AS kwh,
                ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS cost,
                ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
            FROM grid_energy ge
            JOIN energy_rates r ON
                r.id = ge.rate_id
            LEFT JOIN energy_rates r2 ON
                r2.id = ge.export_rate_id
            JOIN energy_suppliers s ON
                s.id = r.supplier_id
            WHERE
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN
                DATE(${start}) AND DATE(${end})
        `;
        return usageTotals;
    } catch (e) {
        if (e.code === "SQLITE_BUSY" && tryCount < 3) {
            console.log("Database is locked, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return dbUsageTotals(start, end, tryCount + 1); // Retry the query
        }
        throw e;
    }
}

async function dbDaysUsage(num_days, tryCount = 1) {
    try {
        const days_usage = await prisma.$queryRaw`
            WITH week(date) AS (
                SELECT date('now', 'localtime', ${num_days}) 
                UNION ALL 
                SELECT date(date, 'localtime', '+1 day') 
                FROM week 
                WHERE date < date('now', 'localtime', '-1 day') 
            )
            SELECT 
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') AS date,
                CASE
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '0' THEN 'Sun'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '1' THEN 'Mon'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '2' THEN 'Tue'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '3' THEN 'Wed'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '4' THEN 'Thu'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '5' THEN 'Fri'
                    WHEN strftime('%w', DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')) = '6' THEN 'Sat'
                END AS dow,
                ROUND((s.standing_charge/100),2) AS standing_charge,
                ROUND(SUM(ge.kwh_imported),2) AS total_kwh,
                ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS total_rate,
                ROUND((SUM((r.cost/100) * ge.kwh_imported)) + (s.standing_charge/100),2) AS total_cost
            FROM week w
            LEFT JOIN grid_energy ge
                ON DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') = w.date
            JOIN energy_rates r ON
                r.id = ge.rate_id
            JOIN energy_suppliers s ON
                s.id = r.supplier_id
            GROUP BY 1,2
            ORDER BY 1
        `;
        return days_usage;
    } catch (e) {
        if (e.code === "SQLITE_BUSY" && tryCount < 3) {
            console.log("Database is locked, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return dbDaysUsage(num_days, tryCount + 1); // Retry the query
        }
        throw e;
    }
}

// /////// //
// Routes //
router.get("/suppliers", async (req, res) => {
    const suppliers = await prisma.energySupplier.findMany({});
    res.json(suppliers);
});

router.get("/solar/realtime", async (req, res) => {
    try {
        const logger_meta = await prisma.$queryRaw`
            SELECT
                key, 
                value
            FROM Credentials c
            JOIN entities e ON
                e.id = c.entity_id
            WHERE 
                LOWER(e.entity_name) = 's3-wifi-st'
        `;
        const creds = {};
        for (const row of logger_meta) {
            creds[row.key] = row.value;
        }
        let now_data = {};
        const today_rate = await prisma.$queryRaw`
            SELECT
                cost
            FROM energy_suppliers s
            JOIN energy_rates r ON
                r.supplier_id = s.id
            WHERE supplier_end IS NULL
            AND rate_type IN ('peak', 'fixed')
        `;

        axios.get(`http://${creds.ip_addr}/inverter.cgi`, { auth: { username: creds.user, password: creds.password } }).then(async (response) => {
            const logger_content = response.data;
            const split_content = logger_content.split(";");

            now_data = {
                firmware_version: split_content[1],
                inverter_model: split_content[2],
                inverter_temperature: Number(split_content[3]),
                current_power: Number(split_content[4]),
                power_unit: "watts",
                yield_today: Number(split_content[5]),
                yield_unit: "kWh",
                cost: Number(today_rate[0].cost) / 100,
            };
            console.log(now_data);

            res.json(now_data);
        }).catch((error) => {
            // handle error
            console.log("error", `API Error: ${error}`);
            res.status(500).send("Internal Server Error");
        }).finally(() => {
            // always executed
        });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
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
    let { start } = req.query;
    let { end } = req.query;
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

    if (unit === "day") {
        unit = "DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime')";
    }

    const usageSum = await dbUsageSumInfo(start, end);
    if (!usageSum) {
        res.status(500).json({ error: "Database is locked, try again later." });
        return;
    }
    const usageTotals = await dbUsageTotals(start, end);
    if (!usageTotals) {
        res.status(500).json({ error: "Database is locked, try again later." });
        return;
    }

    res.json({ days: usageSum, totals: usageTotals[0] });
});

router.get("/usage/days", async (req, res) => {
    let num_days = req.query.num || 7;
    num_days = `-${num_days} day`;
    const days_usage = await dbDaysUsage(num_days);
    if (!days_usage) {
        res.status(500).json({ error: "Database is locked, try again later." });
        return;
    }

    res.json({ data: days_usage });
});

router.get("/usage/entities/days", async (req, res) => {
    let num_days = req.query.num;
    num_days = `-${num_days} day`;
    try {
        const entities = await prisma.$queryRaw`
            SELECT
                DATE(datetime_start, 'localtime') AS date,
                e.entity_type,
                SUM(kwh_used) AS kwh,
                SUM(energy_cost) AS cost
            FROM entity_usage en
            JOIN entities e ON 
                e.id = en.entity_id 
            WHERE 
                DATE(datetime_start, 'localtime') = DATE('now','localtime', ${num_days})
            GROUP BY 1,2
        `;
        res.json(entities);
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/by-rate", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;

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

    const by_rate = await dbQueryRateInfo(start, end);
    if (!by_rate) {
        res.status(500).json({ error: "Database is locked, try again later." });
        return;
    }

    const totals = {
        kwh: 0, cost: 0, kwh_exported: 0, export_return: 0, net_cost: 0,
    };
    for (const rate of by_rate) {
        totals.kwh += rate.total_kwh;
        totals.kwh_exported += rate.kwh_exported;
        totals.cost += rate.total_cost;
        totals.export_return += rate.export_return;
        totals.net_cost += rate.net_cost;
    }
    res.json({ rates: by_rate, totals });
});

router.get("/usage/breakdown", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;

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
    try {
        const overall_consumption = await prisma.$queryRaw`
            SELECT
                ROUND(SUM(ge.kwh_imported),2) AS total_kwh
            FROM grid_energy ge
            WHERE
                DATE(datetime_start, 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
        `;
        const entities = await prisma.$queryRaw`
            SELECT 
                e.type,
                ROUND(SUM(kwh_used),2) AS kwh
            FROM entity_usage en
            JOIN entities e ON
                e.id = en.entity_id 
            WHERE 
                DATE(datetime_start, 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
            GROUP BY 1
            ORDER BY 2 desc
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
            FROM hot_water
            WHERE
                DATE(datetime, 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
        `;

        const pieData = [];
        let heatSum = 0;
        if (centralHeating[0]) {
            const kwh = centralHeating[0].kwh || 0;
            pieData.push({ name: "Central Heating", kwh });
            heatSum += centralHeating[0].kwh;
        }
        if (hw[0]) {
            const kwh = hw[0].kwh || 0;
            pieData.push({ name: "Hot Water", kwh });
            heatSum += hw[0].kwh;
        }
        let eSum = 0;
        for (const e of entities) {
            pieData.push({ name: e.entity_type, kwh: e.kwh });
            eSum += e.kwh;
        }
        let pieOthers = 0;
        for (const y of overall_consumption) {
            pieOthers += y.total_kwh;
        }
        pieOthers -= (heatSum + eSum);
        pieData.push({ name: "Other", kwh: Number(pieOthers.toFixed(2)) });

        res.json({ data: pieData });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/breakdown/by-device", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;

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

    try {
        const overall_consumption = await prisma.$queryRaw`
            SELECT
                ROUND(SUM(ge.kwh_imported),2) AS total_kwh
            FROM grid_energy ge
            WHERE
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
        `;
        const entities = await prisma.$queryRaw`
            SELECT 
                e.entity_name,
                e.entity_type,
                ROUND(SUM(kwh_used),2) AS kwh
            FROM entity_usage en
            JOIN entities e ON
                e.id = en.entity_id 
            WHERE 
                DATE(datetime_start, 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
            GROUP BY 1,2
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
            FROM hot_water
            WHERE
                DATE(datetime, 'localtime') BETWEEN
                    DATE(${start}) AND DATE(${end})
        `;

        const pieData = [];
        let heatSum = 0;
        if (centralHeating[0]) {
            const kwh = centralHeating[0].kwh || 0;
            pieData.push({ name: "Central Heating", kwh });
            heatSum += centralHeating[0].kwh;
        }
        if (hw[0]) {
            const kwh = hw[0].kwh || 0;
            pieData.push({ name: "Hot Water", kwh });
            heatSum += hw[0].kwh;
        }
        let eSum = 0;
        for (const e of entities) {
            pieData.push({ name: e.entity_type, kwh: e.kwh, device: e.entity_name });
            eSum += e.kwh;
        }
        let pieOthers = 0;
        for (const y of overall_consumption) {
            pieOthers += y.total_kwh;
        }
        pieOthers -= (heatSum + eSum);
        pieData.push({ name: "Other", kwh: Number(pieOthers.toFixed(2)) });

        res.json({ data: pieData });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/hourly/compare", async (req, res) => {
    const { date1 } = req.query;
    const { date2 } = req.query;
    const unit = req.query.unit || "hour";
    let xAxis = "%H";
    if (unit === "halfhour") {
        xAxis = "%H:%M";
    }
    try {
        const hourlyUsage = await prisma.$queryRaw`
            WITH day1 AS (
                SELECT 
                    strftime(${xAxis}, datetime(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS hour,
                    ROUND(SUM(ge.kwh_imported), 2) AS total_kwh
                FROM grid_energy ge
                    JOIN energy_rates r ON r.id = ge.rate_id
                    JOIN energy_suppliers s ON s.id = r.supplier_id
                WHERE date(ge.datetime_start / 1000, 'unixepoch', 'localtime') = date(${date1}, 'localtime')
                GROUP BY 1
                ORDER BY 1
            ),
            day2 AS (
                SELECT 
                    strftime(${xAxis}, datetime(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS hour,
                    ROUND(SUM(ge.kwh_imported), 2) AS total_kwh
                FROM grid_energy ge
                    JOIN energy_rates r ON r.id = ge.rate_id
                    JOIN energy_suppliers s ON s.id = r.supplier_id
                WHERE date(ge.datetime_start / 1000, 'unixepoch', 'localtime') = date(${date2}, 'localtime')
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
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/heating", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
    const unit = req.query.unit || "day";
    if (!start) {
        if (unit === "day") {
            start = DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
        } else if (unit === "month") {
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
    try {
        if (unit === "day") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d', h.datetime, 'localtime') AS dt,
                    ROUND(SUM(hw.kwh_consumed),2) AS hot_water_kwh,
                    ROUND(SUM(h.kwh_consumed),2) AS heating_kwh,
                    ROUND(SUM(hw.kwh_produced),2) AS hot_water_kwh_produced,
                    ROUND(SUM(h.kwh_produced),2) AS heating_kwh_produced,
                    ROUND(SUM(hw.hot_water_cop),2) AS hot_water_cop,
                    ROUND(SUM(h.heating_cop),2) AS heating_cop
                FROM hot_water hw
                JOIN Heating h ON 
                    h.datetime = hw.datetime
                    AND h.granularity = hw.granularity
                WHERE
                    h.granularity = 'daily'
                    AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
        } else if (unit === "month") {
            usage = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m', h.datetime, 'localtime') AS dt,
                ROUND(SUM(hw.kwh_consumed),2) AS hot_water_kwh,
                ROUND(SUM(h.kwh_consumed),2) AS heating_kwh,
                ROUND(SUM(hw.kwh_produced),2) AS hot_water_kwh_produced,
                ROUND(SUM(h.kwh_produced),2) AS heating_kwh_produced,
                ROUND(SUM(hw.hot_water_cop),2) AS hot_water_cop,
                ROUND(SUM(h.heating_cop),2) AS heating_cop
            FROM hot_water hw
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
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/heating/temperatures", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
    const unit = req.query.unit || "hour";
    if (!start) {
        if (unit === "day") {
            start = DateTime.now().minus({ days: 31 }).toFormat("yyyy-MM-dd");
        } else if (unit === "month") {
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
    try {
        if (unit == "hour") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d %H', datetime, 'localtime') AS dt,
                    ROUND(setTemperature,2) AS setTemperature,
                    ROUND(outsideTemperature,2) AS outsideTemperature,
                    ROUND(insideTemperature,2) AS insideTemperature,
                    ROUND(tankTemperature,2) AS tankTemperature
                FROM Temperature
                WHERE
                    unit = 'hour'
                    AND DATE(datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
        } else if (unit == "day") {
            usage = await prisma.$queryRaw`
            SELECT
                    strftime('%Y-%m-%d', datetime, 'localtime') AS dt,
                    ROUND(AVG(setTemperature),2) AS setTemperature,
                    ROUND(AVG(outsideTemperature),2) AS outsideTemperature,
                    ROUND(AVG(insideTemperature),2) AS insideTemperature,
                    ROUND(AVG(tankTemperature),2) AS tankTemperature
                FROM Temperature
                WHERE
                    DATE(datetime, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY 1 ORDER BY 1
            `;
        }
        res.json({ data: usage });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/vehicles", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
    const unit = req.query.unit || "day";
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
    try {
        if (unit === "day") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m-%d', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM entity_usage eu
                JOIN entities e ON
                    e.id = eu.entity_id 
                WHERE
                    e.entity_type = 'Car Charging'
                    AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                GROUP BY
                    1
                ORDER BY
                    1
            `;
        } else if (unit === "month") {
            usage = await prisma.$queryRaw`
                SELECT
                    strftime('%Y-%m', datetime_start, 'localtime') AS dt,
                    ROUND(SUM(kwh_used),2) AS kwh,
                    ROUND(SUM(energy_cost),2) AS cost
                FROM entity_usage eu
                JOIN entities e ON
                    e.id = eu.entity_id 
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
        const totals = { kwh: 0, cost: 0 };
        for (const rate of usage) {
            totals.kwh += rate.kwh;
            totals.cost += rate.cost;
        }
        totals.kwh = Number(totals.kwh.toFixed(2));
        totals.cost = Number(totals.cost.toFixed(2));
        res.json({ data: usage, totals });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/usage/main", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
    const unit = req.query.unit || "day";
    const filter = req.query.filter || "all";

    let startMinusTime = {};
    let endMinusTime = {};

    if (unit === "halfhour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit === "hour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit === "day") {
        startMinusTime = { days: 30 };
        endMinusTime = { days: 1 };
    } else if (unit === "month") {
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
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    let usage = [];
    let totals = [];
    try {
        if (unit === "halfhour") {
            if (filter === "all") {
                usage = await prisma.$queryRaw`
                    SELECT
                        strftime("%Y-%m-%d %H:%M", DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS dt,
                        r.rate_type,
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY 1, 2
                    ORDER BY
                        1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                `;
            } else {
                usage = await prisma.$queryRaw`
                    WITH rate_list AS (
                        SELECT 
                            strftime("%Y-%m-%d %H:%M", DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS hhour,
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        strftime("%Y-%m-%d %H:%M", CAST(julianday(DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) * 48 AS INTEGER) / 48.0) AS dt,
                        r.rate_type,
                        ROUND(SUM(eu.kwh_used),4) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),4) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                        AND e.entity_type = ${filter}
                    GROUP BY 1, 2
                    ORDER BY 1
                `;
                totals = await prisma.$queryRaw`
                    WITH rate_list AS (
                        SELECT 
                            strftime("%Y-%m-%d %H:%M", DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS hhour,
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        ROUND(SUM(eu.kwh_used),4) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                        AND e.entity_type = ${filter}
                `;
            }
        } else if (unit === "hour") {
            if (filter === "all") {
                usage = await prisma.$queryRaw`
                    SELECT
                        strftime("%Y-%m-%d %H", DATETIME(ge.datetime_start / 1000, 'unixepoch', 'localtime')) AS dt,
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM
                        grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN Supplier s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY
                        1
                    ORDER BY
                        1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM
                        grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                `;
            } else {
                // TODO: Improve performance of these queries
                usage = await prisma.$queryRaw`
                    WITH rate_list AS (
                        SELECT 
                            strftime("%Y-%m-%d %H:%M", datetime_start) AS hhour,
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        strftime("%Y-%m-%d %H", CAST(julianday(eu.datetime_start, 'localtime') * 24 AS INTEGER) / 24.0) AS dt,
                        '' AS rate_type,
                        ROUND(SUM(eu.kwh_used),4) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
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
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        ROUND(SUM(eu.kwh_used),4) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
                    WHERE
                        DATE(eu.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                        AND e.entity_type = ${filter}
                `;
            }
        } else if (unit === "day") {
            if (filter === "all") {
                usage = await prisma.$queryRaw`
                    SELECT
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') AS dt,
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY
                        1
                    ORDER BY
                        1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                        ROUND((SUM((r.cost/100) * ge.kwh_imported)),2) AS cost,
                        ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    LEFT JOIN energy_rates r2 ON
                        r2.id = ge.export_rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                `;
            } else if (filter === "central-heating") {
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
                    FROM hot_water h
                    WHERE
                        h.granularity = 'daily'
                        AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY 1 ORDER BY 1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(h.kwh_consumed),2) AS kwh,
                        0.0 AS cost
                    FROM hot_water h
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
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id 
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
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id 
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
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        strftime('%Y-%m-%d', datetime_start, 'localtime') AS dt,
                        ROUND(SUM(kwh_used),2) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
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
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start) BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        ROUND(SUM(kwh_used),2) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
                    WHERE
                        e.entity_type = ${filter}
                        AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                `;
            }
        } else if (unit === "month") {
            if (filter === "all") {
                usage = await prisma.$queryRaw`
                    SELECT
                        strftime("%Y-%m", e.datetime_start, 'localtime') AS dt,
                        ROUND(SUM(ge.kwh),2) AS kwh,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY
                        1
                    ORDER BY
                        1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(ge.kwh_imported),2) AS kwh,
                        ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost
                    FROM grid_energy ge
                    JOIN energy_rates r ON
                        r.id = ge.rate_id
                    JOIN energy_suppliers s ON
                        s.id = r.supplier_id
                    WHERE
                        DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
                `;
            } else if (filter === "central-heating") {
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
            } else if (filter === "hot_water") {
                usage = await prisma.$queryRaw`
                    SELECT
                        strftime('%Y-%m', h.datetime, 'localtime') AS dt,
                        ROUND(SUM(h.kwh_consumed),2) AS kwh,
                        0.0 AS cost
                    FROM hot_water h
                    WHERE
                        h.granularity = 'daily'
                        AND DATE(h.datetime, 'localtime') BETWEEN ${start} AND ${end}
                    GROUP BY 1 ORDER BY 1
                `;
                totals = await prisma.$queryRaw`
                    SELECT
                        ROUND(SUM(h.kwh_consumed),2) AS kwh,
                        0.0 AS cost
                    FROM hot_water h
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
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id 
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
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id 
                    WHERE
                        e.entity_type = 'Car Charging'
                        AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                `;
            } else {
                usage = await prisma.$queryRaw`
                    WITH rate_list AS (
                        SELECT 
                            strftime("%Y-%m-%d %H:%M", datetime_start, 'localtime') AS hhour,
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        strftime('%Y-%m', datetime_start, 'localtime') AS dt,
                        ROUND(SUM(kwh_used),2) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
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
                            rate_id
                        FROM grid_energy ge
                        WHERE
                            DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                    )
                    SELECT
                        ROUND(SUM(kwh_used),2) AS kwh,
                        ROUND(SUM(r.cost/100 * eu.kwh_used),2) AS cost
                    FROM entity_usage eu
                    JOIN entities e ON
                        e.id = eu.entity_id
                    JOIN rate_list e2 ON
                        hhour = strftime("%Y-%m-%d %H:%M", CAST(julianday(eu.datetime_start, 'localtime') * 48 AS INTEGER) / 48.0)
                    JOIN energy_rates r ON r.id = e2.rate_id
                    WHERE
                        e.entity_type = ${filter}
                        AND DATE(datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                `;
            }
        }
        res.json({ data: usage, totals: totals[0] });
    } catch (e) {
        console.log(e);
        res.json({ error: e });
    }
});

router.get("/carbon/breakdown", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;

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
    try {
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
    } catch (e) {
        console.log(e);
        res.json({ error: e });
    }
});

router.get("/carbon/main", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
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
    try {
        const carbon = await prisma.$queryRaw`
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
    } catch (e) {
        console.log(e);
        res.json({ error: e });
    }
});

router.get("/vehicles/status", async (req, res) => {
    try {
        const carStatus = await prisma.$queryRaw`
            SELECT
                cs.car_id,
                cs.datetime,
                CASE
                    WHEN odometerUnit = 'km' THEN ROUND(odometer * 0.62137,0)
                    ELSE ROUND(odometer,0)
                END AS odometer,
                battery_percent,
                CASE
                    WHEN rangeUnit = 'km' THEN ROUND(estimatedRange * 0.62137, 0)
                    ELSE ROUND(estimatedRange,0)
                END AS estimatedRange,
                charging_status,
                charging_target_percent,
                is_locked,
                c.*
            FROM CarStatus cs, 
            (SELECT car_id, MAX(datetime) AS datetime
                FROM CarStatus GROUP BY 1) max_date 
            JOIN Car c ON
                cs.car_id = c.id
            WHERE
            cs.car_id = max_date.car_id 
            AND cs.datetime = max_date.datetime
        `;

        res.json({ data: carStatus });
    } catch (e) {
        console.log(e);
        res.json({ error: e });
    }
});

router.get("/solar/main", async (req, res) => {
    let { start } = req.query;
    let { end } = req.query;
    const unit = req.query.unit || "day";

    let startMinusTime = {};
    let endMinusTime = {};

    if (unit === "halfhour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit === "hour") {
        startMinusTime = { days: 1 };
        endMinusTime = { hours: 1 };
    } else if (unit === "day") {
        startMinusTime = { days: 30 };
        endMinusTime = { days: 1 };
    } else if (unit === "month") {
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
    } else {
        // TODO: validate it's in yyyy-mm-dd format
    }
    let solar = [];
    let grid = [];
    let totals = [];
    try {
        solar = await prisma.$queryRaw`
            SELECT
                strftime("%Y-%m-%d", s.datetime_start, 'localtime') AS dt,
                ROUND(SUM(s.kwh_produced),2) AS kwh_produced,
                ROUND(SUM(s.kwh_consumed),2) AS kwh_consumed
            FROM solar s
            WHERE
                DATE(s.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                and time_unit = 'day'
            GROUP BY 1
            ORDER BY
                1
        `;

        grid = await prisma.$queryRaw`
            SELECT
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') AS dt,
                ROUND(SUM(ge.kwh_imported),2) AS kwh,
                ROUND(SUM(ge.kwh_exported),2) AS kwh_exported,
                ROUND(SUM(r.cost/100 * ge.kwh_imported),2) AS cost,
                ROUND(IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0),2) AS export_return,
                ROUND(SUM(r.cost/100 * ge.kwh_imported) - IFNULL(SUM(r2.cost/100 * ge.kwh_exported),0), 2) AS net_cost
            FROM grid_energy ge
            JOIN energy_rates r ON
                r.id = ge.rate_id
            left JOIN energy_rates r2 ON
                r2.id = ge.export_rate_id
            JOIN energy_suppliers s ON
                s.id = r.supplier_id
            WHERE
                DATE(ge.datetime_start / 1000, 'unixepoch', 'localtime') BETWEEN ${start} AND ${end}
            GROUP BY
                1
            ORDER BY
                1
        `;

        totals = await prisma.$queryRaw`
            SELECT
                ROUND(SUM(s.kwh_produced),2) AS kwh_produced,
                ROUND(SUM(s.kwh_consumed),2) AS kwh_consumed
            FROM solar s
            WHERE
                DATE(s.datetime_start, 'localtime') BETWEEN ${start} AND ${end}
                and time_unit = 'day'
        `;

        res.json({ data: solar, totals, grid });
    } catch (e) {
        console.log(e);
        res.json({ error: e });
    }
});

module.exports = router;
