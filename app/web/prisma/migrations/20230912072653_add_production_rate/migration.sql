-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL,
    "kwh_produced" REAL,
    "granularity" TEXT NOT NULL,
    "rateId" INTEGER,
    "productionRateId" INTEGER,
    "source" TEXT,
    "ratesId" INTEGER,
    CONSTRAINT "Electricity_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Electricity_productionRateId_fkey" FOREIGN KEY ("productionRateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Electricity_ratesId_fkey" FOREIGN KEY ("ratesId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Electricity" ("datetime", "datetime_start", "granularity", "id", "kwh", "kwh_produced", "rateId", "source") SELECT "datetime", "datetime_start", "granularity", "id", "kwh", "kwh_produced", "rateId", "source" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
CREATE UNIQUE INDEX "Electricity_datetime_granularity_key" ON "Electricity"("datetime", "granularity");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
