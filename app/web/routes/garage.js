const express = require("express");

const router = express.Router();
const { DateTime } = require("luxon");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const dates = res.locals.dateShortcuts;
    const cars = await prisma.$queryRaw`
        SELECT
            cs.car_id,
            cs.datetime,
            CASE
                WHEN odometer_unit = 'km' THEN ROUND(odometer * 0.62137,0)
                ELSE ROUND(odometer,0)
            END AS odometer,
            battery_percent,
            CASE
                WHEN range_unit = 'km' THEN ROUND(estimated_range * 0.62137, 0)
                ELSE ROUND(estimated_range,0)
            END AS estimated_range,
            charging_status,
            charging_target_percent,
            is_locked,
            c.*
        FROM car_status cs, 
	    (SELECT car_id, MAX(datetime) AS datetime
            FROM car_status GROUP BY 1) max_date 
        JOIN cars c ON
            cs.car_id = c.id
        WHERE
            cs.car_id = max_date.car_id 
            AND cs.datetime = max_date.datetime
    `;
    const carEfficiency = [];
    for (const car of cars) {
        const { car_id } = car;
        const efficiency = await prisma.$queryRaw`
            WITH batt AS (
                SELECT
                    strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
                    CAST(strftime("%Y", cs.datetime, 'localtime') AS INT) AS jsYear,
                    CAST(strftime("%m", cs.datetime, 'localtime') AS INT) - 1 AS jsMonth,
                    CAST(strftime("%d", cs.datetime, 'localtime') AS INT) AS jsDay,
                    c.id AS car_id,
                    c.battery_size,
                    cs.battery_percent,
                    ROUND(CASE
                        WHEN odometer_unit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                        ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
                    END, 0) AS distance_travelled,
                    ROUND( (battery_percent  - LAG(battery_percent, 1) OVER (ORDER BY datetime)), 0) * -1 AS battery_percent_used
                FROM car_status cs
                JOIN Car c ON
                    c.id = cs.car_id
                WHERE
                    c.id = ${car_id}
                    AND DATE(cs.datetime, 'localtime') BETWEEN ${dates.minus1mStart} AND ${dates.minus1mEnd}
                GROUP BY 1,2,3,4,5,6,7
                ORDER BY cs.datetime DESC
            )
            SELECT 
                b.datetime,
                b.jsYear,
                b.jsMonth,
                b.jsDay,
                c.make || ' ' || c.model AS carName,
                SUM(b.distance_travelled) AS distance_travelled,
                b.battery_size * (SUM(battery_percent_used)/100) AS kwh_used,
                ROUND(SUM(b.distance_travelled) / (b.battery_size * (SUM(battery_percent_used)/100)), 2) AS mpkwh
            FROM batt b
            LEFT JOIN Car c ON 
                c.id = b.car_id
            WHERE
                battery_percent_used > 0
            GROUP BY 1,2,3,4,5
            ORDER BY 1
        `;
        carEfficiency.push(efficiency);
    }

    res.render("garage", {
        title: "Garage", cars, carEfficiency, dates,
    });
});

router.get("/car", async (req, res) => {
    const { id } = req.query;
    const car = await prisma.car.findFirst({
        where: {
            id: Number(id),
        },
    });

    const carStatus = await prisma.$queryRaw`
        SELECT
            cs.car_id,
            cs.datetime,
            CASE
                WHEN odometer_unit = 'km' THEN ROUND(odometer * 0.62137,0)
                ELSE ROUND(odometer,0)
            END AS odometer,
            battery_percent,
            CASE
                WHEN rangeUnit = 'km' THEN ROUND(estimated_range * 0.62137, 0)
                ELSE ROUND(estimated_range,0)
            END AS estimated_range,
            charging_status,
            charging_target_percent,
            is_locked
        FROM car_status cs, 
	        (
                SELECT 
                    car_id,
                    MAX(datetime) AS datetime
                FROM car_status 
                WHERE car_id = ${Number(id)}
                GROUP BY 1 
            ) max_date 
        WHERE
            cs.car_id = ${Number(id)}
            AND cs.datetime = max_date.datetime
    `;

    const carTrips = await prisma.$queryRaw`
        SELECT
            strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
            MAX(CASE
                WHEN odometer_unit = 'km' THEN ROUND(odometer * 0.62137,0)
                ELSE ROUND(odometer,0)
            END) AS odometer,
			ROUND(CASE
                WHEN odometer_unit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
            END, 0) AS distance_travelled
        FROM car_status cs
        WHERE
            cs.car_id = ${Number(id)}
        GROUP BY 1
        ORDER BY cs.datetime DESC
    `;

    let monthsOwned = {};
    if (car.date_purchased) {
        const end = DateTime.now();
        const start = DateTime.fromISO(car.date_purchased);
        monthsOwned = end.diff(start, ["months", "days"]).toObject();
    }

    const carEfficiency = await prisma.$queryRaw`
        WITH batt AS (                    
            SELECT
                strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
                c.battery_size,
                cs.battery_percent,
                ROUND(CASE
                    WHEN odometer_unit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                    ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
                END, 0) AS distance_travelled,
                ROUND( (battery_percent  - LAG(battery_percent, 1) OVER (ORDER BY datetime)), 0) * -1 AS battery_percent_used
            FROM car_status cs
            JOIN cars c ON
                c.id = cs.car_id
            WHERE
                cs.car_id = ${Number(id)}
            GROUP BY 1,2,3
            ORDER BY cs.datetime DESC
        )
        SELECT b.datetime,
            SUM(b.distance_travelled) AS distance_travelled,
            battery_size * (SUM(battery_percent_used)/100) AS kwh_used,
            ROUND(SUM(b.distance_travelled) / (battery_size * (SUM(battery_percent_used)/100)), 2) AS mpkwh
        FROM batt b
        WHERE battery_percent_used > 0
        GROUP BY 1
        ORDER BY 1 DESC
    `;

    res.render("garage/car", {
        title: `${car.make} ${car.model}`,
        car,
        carStatus: carStatus[0],
        carTrips,
        carEfficiency,
        monthsOwned,
    });
});

module.exports = router;
