const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
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

    res.render("garage", { page_title: "Garage", cars: cars });
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
        monthsOwned = end.diff(start, ['months', 'days']).toObject();
    }

    res.render("garage/car", {
        page_title: `${car.make} ${car.model}`,
        car: car,
        carStatus: carStatus[0],
        carTrips: carTrips,
        monthsOwned: monthsOwned,
    });
});

module.exports = router;
