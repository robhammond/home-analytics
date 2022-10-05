/*
  Warnings:

  - You are about to drop the `ElectricTariff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ElectricTariff";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplier" TEXT NOT NULL,
    "tariff_name" TEXT NOT NULL,
    "standing_charge" REAL NOT NULL,
    "supplier_start" DATETIME,
    "supplier_end" DATETIME
);

-- CreateTable
CREATE TABLE "Rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER NOT NULL,
    "rate_type" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "cost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    CONSTRAINT "Rates_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
