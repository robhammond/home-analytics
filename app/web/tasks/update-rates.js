const { PrismaClient } = require("@prisma/client");
const { DateTime } = require("luxon");
// require('dotenv').config();

const prisma = new PrismaClient();

// find the relevant supplier ID based on the date
async function findsupplier_id(dateLocal, tariffType) {
    try {
        const supplier = await prisma.supplier.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            {
                                supplier_start: {
                                    lte: dateLocal,
                                },
                                supplier_end: {
                                    gte: dateLocal,
                                },
                            },
                        ],
                    },
                    {
                        AND: [
                            {
                                supplier_start: {
                                    lte: dateLocal,
                                },
                                supplier_end: null,
                            },
                        ],
                    },
                ],
                tariff_type: tariffType,
            },
            select: {
                id: true,
            },
        });

        return supplier.id;
    } catch (error) {
        console.error("Error finding supplier:", error);
    }
}

const updateImport = async () => {
    try {
        // Fetch records where rateId is null
        const usageRecords = await prisma.electricity.findMany({
            where: {
                rateId: null,
            },
        });

        for (const record of usageRecords) {
            const rateId = await computeRateId(record.datetime_start, "import");

            try {
                const updatedRow = await prisma.electricity.update({
                    where: {
                        id: record.id,
                    },
                    data: {
                        rateId,
                    },
                });
            } catch (e) {
                console.log(e);
            }
        }
    } catch (error) {
        console.error(`Error updating import rates: ${error}`);
    } finally {
        // await prisma.$disconnect();
    }
};

const computeRateId = async (datetime_start, tariffType) => {
    const local_tz = "Europe/London";
    const startDtUtc = DateTime.fromJSDate(datetime_start, { zone: "utc" });
    const startDtLocal = startDtUtc.setZone(local_tz);

    const supplier_id = await findsupplier_id(startDtLocal, tariffType);
    const supplierRates = await prisma.rates.findMany({
        where: {
            supplier: {
                id: supplier_id,
            },
        },
    });
    // console.log(supplierRates);

    for (const rate of supplierRates) {
        if (rate.rate_type === "fixed") {
            return rate.id;
        }

        if (rate.rate_type === "off-peak" || rate.rate_type === "peak") {
            const start_str = String(rate.start_time);
            const end_str = String(rate.end_time);
            const start = /^(\d\d):(\d\d)$/.exec(start_str);
            const end = /^(\d\d):(\d\d)$/.exec(end_str);

            let dtStart = startDtLocal.set({
                hour: start[1], minute: start[2], second: 0, millisecond: 0,
            });
            let dtEnd = startDtLocal.set({
                hour: end[1], minute: end[2], second: 0, millisecond: 0,
            });

            if (dtEnd < dtStart) {
                dtStart = dtStart.minus({ days: 1 });
                dtEnd = dtEnd.plus({ days: 1 });
            } else {
                dtEnd = dtEnd.minus({ seconds: 1 });
            }

            if (startDtLocal >= dtStart && startDtLocal <= dtEnd) {
                console.log(`Matching to rate: ${rate.rate_type}`);
                return rate.id;
            }
        }
    }

    return null;
};

const updateExport = async () => {
    try {
        // Fetch records where exportRateId for export is be null
        const exportRecords = await prisma.electricity.findMany({
            where: {
                exportRateId: null,
                kwh_exported: { not: null },
            },
        });

        for (const record of exportRecords) {
            const exportRateId = await computeRateId(record.datetime_start, "export");
            try {
                const updatedRow = await prisma.electricity.update({
                    where: {
                        id: record.id,
                    },
                    data: {
                        exportRateId,
                    },
                });
                console.log(`Record updated: ${updatedRow.id}`);
            } catch (e) {
                console.error(`Error updating record ID ${record.id}: ${e}`);
            }
        }
    } catch (error) {
        console.error(`Error updating export rates: ${error}`);
    } finally {
        // await prisma.$disconnect();
    }
};

// updateImport();
// updateExport();

module.exports = {
    updateImport,
    updateExport,
};
