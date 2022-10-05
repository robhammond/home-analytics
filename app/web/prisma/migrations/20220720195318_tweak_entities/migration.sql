/*
  Warnings:

  - You are about to drop the `UsageCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Electricity" ADD COLUMN "datetime_start" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UsageCategory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Entity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_url" TEXT,
    "entity_image" TEXT,
    "entity_location" TEXT
);

-- CreateTable
CREATE TABLE "EntityUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "entityId" INTEGER NOT NULL,
    "granularity" TEXT NOT NULL,
    "kwh_used" REAL NOT NULL,
    CONSTRAINT "EntityUsage_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carId" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "granularity" TEXT NOT NULL,
    "miles_travelled" REAL,
    "km_travelled" REAL,
    "kwh_used" REAL,
    CONSTRAINT "CarUsage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CarUsage" ("carId", "datetime", "granularity", "id", "km_travelled", "kwh_used", "miles_travelled") SELECT "carId", "datetime", "granularity", "id", "km_travelled", "kwh_used", "miles_travelled" FROM "CarUsage";
DROP TABLE "CarUsage";
ALTER TABLE "new_CarUsage" RENAME TO "CarUsage";
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "registration_number" TEXT,
    "purchase_price" REAL,
    "sale_price" REAL,
    "mot_date" TEXT,
    "service_date" TEXT,
    "dateAcquired" DATETIME,
    "dateSold" DATETIME
);
INSERT INTO "new_Car" ("dateAcquired", "dateSold", "id", "make", "model", "registration_number") SELECT "dateAcquired", "dateSold", "id", "make", "model", "registration_number" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
