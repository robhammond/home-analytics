-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ElectricTariff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tariff_name" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "variable_cost" REAL NOT NULL,
    "standing_charge" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "start_time" TEXT,
    "end_time" TEXT,
    "tariff_start" DATETIME,
    "tariff_end" DATETIME
);
INSERT INTO "new_ElectricTariff" ("currency", "end_time", "id", "standing_charge", "start_time", "supplier", "tariff_end", "tariff_name", "tariff_start", "variable_cost") SELECT "currency", "end_time", "id", "standing_charge", "start_time", "supplier", "tariff_end", "tariff_name", "tariff_start", "variable_cost" FROM "ElectricTariff";
DROP TABLE "ElectricTariff";
ALTER TABLE "new_ElectricTariff" RENAME TO "ElectricTariff";
CREATE TABLE "new_Electricity" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL NOT NULL,
    "granularity" TEXT NOT NULL
);
INSERT INTO "new_Electricity" ("datetime", "granularity", "id", "kwh") SELECT "datetime", "granularity", "id", "kwh" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
