/*
  Warnings:

  - You are about to drop the column `cooling_consumed` on the `Cooling` table. All the data in the column will be lost.
  - You are about to drop the column `cooling_produced` on the `Cooling` table. All the data in the column will be lost.
  - You are about to drop the column `hot_water_consumed` on the `HotWater` table. All the data in the column will be lost.
  - You are about to drop the column `hot_water_produced` on the `HotWater` table. All the data in the column will be lost.
  - Added the required column `kwh_consumed` to the `Cooling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kwh_produced` to the `Cooling` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kwh_consumed` to the `HotWater` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kwh_produced` to the `HotWater` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cooling" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "cooling_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);
INSERT INTO "new_Cooling" ("cooling_cop", "datetime", "granularity", "id") SELECT "cooling_cop", "datetime", "granularity", "id" FROM "Cooling";
DROP TABLE "Cooling";
ALTER TABLE "new_Cooling" RENAME TO "Cooling";
CREATE UNIQUE INDEX "Cooling_datetime_granularity_key" ON "Cooling"("datetime", "granularity");
CREATE TABLE "new_HotWater" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "hot_water_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);
INSERT INTO "new_HotWater" ("datetime", "granularity", "hot_water_cop", "id") SELECT "datetime", "granularity", "hot_water_cop", "id" FROM "HotWater";
DROP TABLE "HotWater";
ALTER TABLE "new_HotWater" RENAME TO "HotWater";
CREATE UNIQUE INDEX "HotWater_datetime_granularity_key" ON "HotWater"("datetime", "granularity");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
