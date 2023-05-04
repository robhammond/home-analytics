-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Solar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME,
    "kwh_produced" REAL,
    "kwh_consumed" REAL,
    "kwh_exported" REAL,
    "kwh_imported" REAL,
    "kwh_battery_discharge" REAL,
    "kwh_battery_charge" REAL,
    "time_unit" TEXT DEFAULT 'day'
);
INSERT INTO "new_Solar" ("datetime_end", "datetime_start", "id", "kwh_battery_charge", "kwh_battery_discharge", "kwh_consumed", "kwh_exported", "kwh_imported", "kwh_produced") SELECT "datetime_end", "datetime_start", "id", "kwh_battery_charge", "kwh_battery_discharge", "kwh_consumed", "kwh_exported", "kwh_imported", "kwh_produced" FROM "Solar";
DROP TABLE "Solar";
ALTER TABLE "new_Solar" RENAME TO "Solar";
CREATE UNIQUE INDEX "Solar_datetime_start_time_unit_key" ON "Solar"("datetime_start", "time_unit");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
