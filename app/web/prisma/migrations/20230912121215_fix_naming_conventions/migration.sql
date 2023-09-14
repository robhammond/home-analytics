/*
  Warnings:

  - You are about to drop the column `kwh_produced` on the `Electricity` table. All the data in the column will be lost.
  - You are about to drop the column `productionRateId` on the `Electricity` table. All the data in the column will be lost.
  - You are about to drop the column `ratesId` on the `Electricity` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL,
    "kwh_exported" REAL,
    "granularity" TEXT NOT NULL,
    "rateId" INTEGER,
    "exportRateId" INTEGER,
    "source" TEXT,
    CONSTRAINT "Electricity_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Electricity_exportRateId_fkey" FOREIGN KEY ("exportRateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Electricity" ("datetime", "datetime_start", "granularity", "id", "kwh", "rateId", "source") SELECT "datetime", "datetime_start", "granularity", "id", "kwh", "rateId", "source" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
CREATE UNIQUE INDEX "Electricity_datetime_granularity_key" ON "Electricity"("datetime", "granularity");
CREATE TABLE "new_Supplier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplier" TEXT NOT NULL,
    "tariff_name" TEXT NOT NULL,
    "tariff_type" TEXT NOT NULL DEFAULT 'import',
    "standing_charge" REAL,
    "supplier_start" DATETIME,
    "supplier_end" DATETIME
);
INSERT INTO "new_Supplier" ("id", "standing_charge", "supplier", "supplier_end", "supplier_start", "tariff_name", "tariff_type") SELECT "id", "standing_charge", "supplier", "supplier_end", "supplier_start", "tariff_name", "tariff_type" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
