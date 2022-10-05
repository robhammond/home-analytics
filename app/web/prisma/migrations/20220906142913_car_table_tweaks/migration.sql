/*
  Warnings:

  - You are about to drop the column `purchase_mileage` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `vin_number` on the `Car` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "CarStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carId" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "odometer" INTEGER,
    "batteryPercent" INTEGER,
    "estimatedRange" INTEGER,
    "chargingStatus" INTEGER,
    "chargingRemainingTime" INTEGER,
    CONSTRAINT "CarStatus_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "batterySize" INTEGER,
    "registration_number" TEXT,
    "vin" TEXT,
    "purchase_price" REAL,
    "purchase_odometer" INTEGER,
    "sale_price" REAL,
    "mot_date" TEXT,
    "service_date" TEXT,
    "tax_date" TEXT,
    "dateAcquired" DATETIME,
    "dateSold" DATETIME
);
INSERT INTO "new_Car" ("dateAcquired", "dateSold", "id", "make", "model", "mot_date", "purchase_price", "registration_number", "sale_price", "service_date", "tax_date") SELECT "dateAcquired", "dateSold", "id", "make", "model", "mot_date", "purchase_price", "registration_number", "sale_price", "service_date", "tax_date" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
