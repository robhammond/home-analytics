/*
  Warnings:

  - You are about to drop the `PeakTimes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[datetime,granularity]` on the table `Electricity` will be added. If there are existing duplicate values, this will fail.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PeakTimes";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Heating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "heating_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "Cooling" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "cooling_consumed" REAL NOT NULL,
    "cooling_produced" REAL NOT NULL,
    "cooling_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "HotWater" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "hot_water_produced" REAL NOT NULL,
    "hot_water_consumed" REAL NOT NULL,
    "hot_water_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "Temperature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "outside_temperature" REAL,
    "inside_temperature" REAL,
    "tank_temperature" REAL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateIndex
CREATE UNIQUE INDEX "Heating_datetime_granularity_key" ON "Heating"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "Cooling_datetime_granularity_key" ON "Cooling"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "HotWater_datetime_granularity_key" ON "HotWater"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "Temperature_datetime_granularity_key" ON "Temperature"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "Electricity_datetime_granularity_key" ON "Electricity"("datetime", "granularity");
