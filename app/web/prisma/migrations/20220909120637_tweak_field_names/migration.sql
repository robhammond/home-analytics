/*
  Warnings:

  - You are about to drop the column `inside_temperature` on the `Temperature` table. All the data in the column will be lost.
  - You are about to drop the column `outside_temperature` on the `Temperature` table. All the data in the column will be lost.
  - You are about to drop the column `tank_temperature` on the `Temperature` table. All the data in the column will be lost.
  - You are about to drop the column `km_travelled` on the `CarUsage` table. All the data in the column will be lost.
  - You are about to drop the column `kwh_used` on the `CarUsage` table. All the data in the column will be lost.
  - You are about to drop the column `miles_travelled` on the `CarUsage` table. All the data in the column will be lost.
  - You are about to drop the column `annual_cost` on the `Insurance` table. All the data in the column will be lost.
  - You are about to drop the column `date_end` on the `Insurance` table. All the data in the column will be lost.
  - You are about to drop the column `date_start` on the `Insurance` table. All the data in the column will be lost.
  - You are about to drop the column `mot_date` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `purchase_odometer` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `purchase_price` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `registration_number` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `sale_price` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `service_date` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `tax_date` on the `Car` table. All the data in the column will be lost.
  - Added the required column `annualCost` to the `Insurance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateEnd` to the `Insurance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateStart` to the `Insurance` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Temperature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "outsideTemperature" REAL,
    "insideTemperature" REAL,
    "tankTemperature" REAL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);
INSERT INTO "new_Temperature" ("datetime", "granularity", "id") SELECT "datetime", "granularity", "id" FROM "Temperature";
DROP TABLE "Temperature";
ALTER TABLE "new_Temperature" RENAME TO "Temperature";
CREATE UNIQUE INDEX "Temperature_datetime_granularity_key" ON "Temperature"("datetime", "granularity");
CREATE TABLE "new_CarUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carId" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "granularity" TEXT NOT NULL,
    "distanceTravelled" REAL,
    "distanceUnit" REAL,
    "kwhUsed" REAL,
    CONSTRAINT "CarUsage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CarUsage" ("carId", "datetime", "granularity", "id") SELECT "carId", "datetime", "granularity", "id" FROM "CarUsage";
DROP TABLE "CarUsage";
ALTER TABLE "new_CarUsage" RENAME TO "CarUsage";
CREATE TABLE "new_Insurance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateStart" TEXT NOT NULL,
    "dateEnd" TEXT NOT NULL,
    "annualCost" REAL NOT NULL,
    "entityId" INTEGER,
    "carId" INTEGER,
    CONSTRAINT "Insurance_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Insurance_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Insurance" ("carId", "entityId", "id", "provider", "type") SELECT "carId", "entityId", "id", "provider", "type" FROM "Insurance";
DROP TABLE "Insurance";
ALTER TABLE "new_Insurance" RENAME TO "Insurance";
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "batterySize" INTEGER,
    "registrationNumber" TEXT,
    "vin" TEXT,
    "purchasePrice" REAL,
    "purchaseOdometer" INTEGER,
    "salePrice" REAL,
    "motDate" TEXT,
    "serviceDate" TEXT,
    "taxDate" TEXT,
    "imageUrl" TEXT,
    "dateAcquired" DATETIME,
    "dateSold" DATETIME
);
INSERT INTO "new_Car" ("batterySize", "dateAcquired", "dateSold", "id", "imageUrl", "make", "model", "variant", "vin") SELECT "batterySize", "dateAcquired", "dateSold", "id", "imageUrl", "make", "model", "variant", "vin" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
