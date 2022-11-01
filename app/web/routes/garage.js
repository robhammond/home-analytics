const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    const dates = res.locals.dateShortcuts;
    const cars = await prisma.$queryRaw`
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
    let carEfficiency = [];
    for (let car of cars) {
        let car_id = car["carId"];
        let efficiency = await prisma.$queryRaw`
            WITH batt AS (
                SELECT
                    strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
                    CAST(strftime("%Y", cs.datetime, 'localtime') AS INT) AS jsYear,
                    CAST(strftime("%m", cs.datetime, 'localtime') AS INT) - 1 AS jsMonth,
                    CAST(strftime("%d", cs.datetime, 'localtime') AS INT) AS jsDay,
                    c.id AS car_id,
                    c.batterySize,
                    cs.batteryPercent,
                    ROUND(CASE
                        WHEN odometerUnit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                        ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
                    END, 0) AS distance_travelled,
                    ROUND( (batteryPercent  - LAG(batteryPercent, 1) OVER (ORDER BY datetime)), 0) * -1 AS battery_percent_used
                FROM CarStatus cs
                JOIN Car c ON
                    c.id = cs.carId
                WHERE
                    c.id = ${car_id}
                    AND DATE(cs.datetime, 'localtime') BETWEEN ${dates["minus1mStart"]} AND ${dates["minus1mEnd"]}
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
                b.batterySize * (SUM(battery_percent_used)/100) AS kwh_used,
                ROUND(SUM(b.distance_travelled) / (b.batterySize * (SUM(battery_percent_used)/100)), 2) AS mpkwh
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

    res.render("garage", { page_title: "Garage", cars: cars, carEfficiency: carEfficiency, dates: dates, });
});

router.get("/car", async (req, res) => {
    const id = req.query.id;
    const car = await prisma.car.findFirst({
        where: {
            id: Number(id),
        },
    });

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
            isLocked
        FROM CarStatus cs, 
	        (
                SELECT 
                    carId,
                    MAX(datetime) AS datetime
                FROM CarStatus 
                WHERE carId = ${Number(id)}
                GROUP BY 1 
            ) max_date 
        WHERE
            cs.carId = ${Number(id)}
            AND cs.datetime = max_date.datetime
    `;

    const carTrips = await prisma.$queryRaw`
        SELECT
            strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
            MAX(CASE
                WHEN odometerUnit = 'km' THEN ROUND(odometer * 0.62137,0)
                ELSE ROUND(odometer,0)
            END) AS odometer,
			ROUND(CASE
                WHEN odometerUnit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
            END, 0) AS distance_travelled
        FROM CarStatus cs
        WHERE
            cs.carId = ${Number(id)}
        GROUP BY 1
        ORDER BY cs.datetime DESC
    `;

    let monthsOwned = {};
    if (car.dateAcquired) {
        var end = DateTime.now();
        var start = DateTime.fromISO(car.dateAcquired);
        monthsOwned = end.diff(start, ["months", "days"]).toObject();
    }

    let carEfficiency = await prisma.$queryRaw`
        WITH batt AS (                    
            SELECT
                strftime("%Y-%m-%d", cs.datetime, 'localtime') AS datetime,
                c.batterySize,
                cs.batteryPercent,
                ROUND(CASE
                    WHEN odometerUnit = 'km' THEN ((odometer * 0.62137) - LAG((odometer * 0.62137), 1) OVER (ORDER BY datetime))
                    ELSE (odometer - LAG(odometer, 1) OVER (ORDER BY datetime))
                END, 0) AS distance_travelled,
                ROUND( (batteryPercent  - LAG(batteryPercent, 1) OVER (ORDER BY datetime)), 0) * -1 AS battery_percent_used
            FROM CarStatus cs
            JOIN Car c ON
                c.id = cs.carId
            WHERE
                cs.carId = ${Number(id)}
            GROUP BY 1,2,3
            ORDER BY cs.datetime DESC
        )
        SELECT b.datetime,
            SUM(b.distance_travelled) AS distance_travelled,
            batterySize * (SUM(battery_percent_used)/100) AS kwh_used,
            ROUND(SUM(b.distance_travelled) / (batterySize * (SUM(battery_percent_used)/100)), 2) AS mpkwh
        FROM batt b
        WHERE battery_percent_used > 0
        GROUP BY 1
        ORDER BY 1 DESC
    `;

    res.render("garage/car", {
        page_title: `${car.make} ${car.model}`,
        car: car,
        carStatus: carStatus[0],
        carTrips: carTrips,
        carEfficiency: carEfficiency,
        monthsOwned: monthsOwned,
    });
});

module.exports = router;
